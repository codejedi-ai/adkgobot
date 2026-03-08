package agent

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"adkbot/internal/agent/tools"
	"adkbot/internal/gemini"
)

type Request struct {
	Input string `json:"input"`
}

type Response struct {
	Reply string `json:"reply"`
}

type Agent struct {
	model *gemini.Client
	tools *tools.Registry
}

func New(model string) *Agent {
	return &Agent{
		model: gemini.NewClient(model),
		tools: tools.NewRegistry(),
	}
}

func (a *Agent) ToolNames() []string {
	return a.tools.Names()
}

func (a *Agent) Run(ctx context.Context, input string) (string, error) {
	systemPrompt := "You are adkbot, a task-focused assistant running through a websocket gateway. " +
		"Available tools: " + strings.Join(a.ToolNames(), ",") + ". " +
		"When you need a tool, respond ONLY as JSON: {\"tool\":\"name\",\"args\":{...}} with no markdown."

	modelOut, err := a.model.Generate(ctx, systemPrompt, input)
	if err != nil {
		return "", err
	}

	var call struct {
		Tool string         `json:"tool"`
		Args map[string]any `json:"args"`
	}
	if err := json.Unmarshal([]byte(strings.TrimSpace(modelOut)), &call); err != nil || call.Tool == "" {
		return modelOut, nil
	}

	toolCtx, cancel := context.WithTimeout(ctx, 15*time.Second)
	defer cancel()
	res, err := a.tools.Execute(toolCtx, call.Tool, call.Args)
	if err != nil {
		return "", err
	}
	resBytes, _ := json.Marshal(res.Output)

	followupInput := fmt.Sprintf("User asked: %s\nTool used: %s\nTool output JSON: %s\nNow provide the final response to the user.", input, res.Name, string(resBytes))
	return a.model.Generate(ctx, "You are adkbot. Keep responses concise and practical.", followupInput)
}

func (a *Agent) RunTool(ctx context.Context, name string, args map[string]any) (tools.ToolResult, error) {
	return a.tools.Execute(ctx, name, args)
}
