package gemini

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"sort"
	"strings"
	"sync"
	"time"

	"adkbot/internal/config"
)

type Client struct {
	apiKey string
	keyErr error
	model  string
	http   http.Client
	mu     sync.RWMutex
}

func NewClient(model string) *Client {
	if model == "" {
		model = config.DefaultModel
	}
	apiKey, keyErr := config.ResolveGoogleAPIKey()
	return &Client{
		apiKey: apiKey,
		keyErr: keyErr,
		model:  model,
		http:   http.Client{Timeout: 25 * time.Second},
	}
}

func (c *Client) Generate(ctx context.Context, systemPrompt, userPrompt string) (string, error) {
	if c.apiKey == "" {
		if c.keyErr != nil {
			return "", c.keyErr
		}
		return "", errors.New("google API key is not set; run 'adkbot onboard'")
	}

	payload := map[string]any{
		"system_instruction": map[string]any{
			"parts": []map[string]string{{"text": systemPrompt}},
		},
		"contents": []map[string]any{
			{
				"role":  "user",
				"parts": []map[string]string{{"text": userPrompt}},
			},
		},
	}

	buf, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}

	model := c.currentModel()
	text, statusCode, body, err := c.generateWithModel(ctx, model, payload)
	if err == nil {
		return text, nil
	}

	if !isModelUnavailable(statusCode, body, err) {
		return "", err
	}

	fallback, derr := c.discoverActiveGenerateContentModel(ctx)
	if derr != nil {
		return "", fmt.Errorf("configured model %q is unavailable and model discovery failed: %w", model, derr)
	}
	if fallback == "" || fallback == model {
		return "", err
	}

	c.setCurrentModel(fallback)
	text, _, _, err = c.generateWithModel(ctx, fallback, payload)
	if err != nil {
		return "", err
	}
	return text, nil
}

func (c *Client) currentModel() string {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.model
}

func (c *Client) setCurrentModel(m string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.model = m
}

func (c *Client) generateWithModel(ctx context.Context, model string, payload map[string]any) (string, int, string, error) {
	buf, err := json.Marshal(payload)
	if err != nil {
		return "", 0, "", err
	}

	url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s", model, c.apiKey)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(buf))
	if err != nil {
		return "", 0, "", err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.http.Do(req)
	if err != nil {
		return "", 0, "", err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", 0, "", err
	}
	if resp.StatusCode >= 300 {
		return "", resp.StatusCode, string(body), fmt.Errorf("gemini API error (%d): %s", resp.StatusCode, string(body))
	}

	var out struct {
		Candidates []struct {
			Content struct {
				Parts []struct {
					Text string `json:"text"`
				} `json:"parts"`
			} `json:"content"`
		} `json:"candidates"`
	}
	if err := json.Unmarshal(body, &out); err != nil {
		return "", resp.StatusCode, string(body), err
	}
	if len(out.Candidates) == 0 || len(out.Candidates[0].Content.Parts) == 0 {
		return "", resp.StatusCode, string(body), errors.New("no response candidates from Gemini")
	}
	return out.Candidates[0].Content.Parts[0].Text, resp.StatusCode, string(body), nil
}

func (c *Client) discoverActiveGenerateContentModel(ctx context.Context) (string, error) {
	url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models?key=%s", c.apiKey)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return "", err
	}
	resp, err := c.http.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}
	if resp.StatusCode >= 300 {
		return "", fmt.Errorf("model list error (%d): %s", resp.StatusCode, string(body))
	}

	var out struct {
		Models []struct {
			Name                       string   `json:"name"`
			SupportedGenerationMethods []string `json:"supportedGenerationMethods"`
		} `json:"models"`
	}
	if err := json.Unmarshal(body, &out); err != nil {
		return "", err
	}

	candidates := make([]string, 0)
	for _, m := range out.Models {
		if !supportsMethod(m.SupportedGenerationMethods, "generateContent") {
			continue
		}
		name := strings.TrimPrefix(m.Name, "models/")
		if strings.HasPrefix(name, "gemini") {
			candidates = append(candidates, name)
		}
	}
	if len(candidates) == 0 {
		return "", errors.New("no active gemini model supports generateContent")
	}

	preferred := []string{
		"gemini-2.5-flash",
		"gemini-2.0-flash",
		"gemini-1.5-flash",
		"gemini-pro",
	}
	for _, p := range preferred {
		for _, c := range candidates {
			if strings.HasPrefix(c, p) {
				return c, nil
			}
		}
	}

	sort.Strings(candidates)
	return candidates[0], nil
}

func supportsMethod(methods []string, method string) bool {
	for _, m := range methods {
		if m == method {
			return true
		}
	}
	return false
}

func isModelUnavailable(statusCode int, body string, err error) bool {
	if statusCode == http.StatusNotFound {
		return true
	}
	lb := strings.ToLower(body)
	if strings.Contains(lb, "not found") || strings.Contains(lb, "not supported") || strings.Contains(lb, "decommission") || strings.Contains(lb, "deprecated") {
		return true
	}
	le := strings.ToLower(err.Error())
	if strings.Contains(le, "not found") || strings.Contains(le, "decommission") {
		return true
	}
	return false
}
