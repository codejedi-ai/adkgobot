package tools

import (
	"context"
	"errors"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

func cliTool(ctx context.Context, args map[string]any) (interface{}, error) {
	cmd := strArg(args, "command")
	if cmd == "" {
		return nil, errors.New("command is required")
	}
	if os.Getenv("ADKBOT_CLI_ALLOW_UNSAFE") != "1" {
		allowedPrefixes := []string{"ls", "pwd", "cat ", "echo ", "date", "whoami", "uname", "find ", "head ", "tail ", "wc ", "git status"}
		ok := false
		for _, p := range allowedPrefixes {
			if cmd == p || strings.HasPrefix(cmd, p) {
				ok = true
				break
			}
		}
		if !ok {
			return nil, errors.New("command not allowed; set ADKBOT_CLI_ALLOW_UNSAFE=1 to allow arbitrary commands")
		}
	}

	ec := exec.CommandContext(ctx, "bash", "-lc", cmd)
	out, err := ec.CombinedOutput()
	res := map[string]any{"command": cmd, "output": string(out)}
	if err != nil {
		res["error"] = err.Error()
	}
	return res, nil
}

func filesystemTool(_ context.Context, args map[string]any) (interface{}, error) {
	op := strArg(args, "operation")
	if op == "" {
		return nil, errors.New("operation is required")
	}
	root := strings.TrimSpace(os.Getenv("ADKBOT_FS_ROOT"))
	if root == "" {
		cwd, _ := os.Getwd()
		root = cwd
	}
	root, _ = filepath.Abs(root)

	switch op {
	case "list":
		target, err := resolvePath(root, strArg(args, "path"))
		if err != nil {
			return nil, err
		}
		entries, err := os.ReadDir(target)
		if err != nil {
			return nil, err
		}
		items := make([]string, 0, len(entries))
		for _, e := range entries {
			name := e.Name()
			if e.IsDir() {
				name += "/"
			}
			items = append(items, name)
		}
		return map[string]any{"path": target, "items": items}, nil
	case "read":
		target, err := resolvePath(root, strArg(args, "path"))
		if err != nil {
			return nil, err
		}
		b, err := os.ReadFile(target)
		if err != nil {
			return nil, err
		}
		max := int(int32Arg(args, "max_bytes"))
		if max > 0 && len(b) > max {
			b = b[:max]
		}
		return map[string]any{"path": target, "content": string(b)}, nil
	case "write":
		target, err := resolvePath(root, strArg(args, "path"))
		if err != nil {
			return nil, err
		}
		if err := os.MkdirAll(filepath.Dir(target), 0o755); err != nil {
			return nil, err
		}
		content := strArg(args, "content")
		if boolArg(args, "append") {
			f, err := os.OpenFile(target, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0o644)
			if err != nil {
				return nil, err
			}
			defer f.Close()
			if _, err := f.WriteString(content); err != nil {
				return nil, err
			}
		} else {
			if err := os.WriteFile(target, []byte(content), 0o644); err != nil {
				return nil, err
			}
		}
		return map[string]any{"path": target, "written": len(content)}, nil
	case "mkdir":
		target, err := resolvePath(root, strArg(args, "path"))
		if err != nil {
			return nil, err
		}
		if err := os.MkdirAll(target, 0o755); err != nil {
			return nil, err
		}
		return map[string]any{"path": target, "created": true}, nil
	case "delete":
		target, err := resolvePath(root, strArg(args, "path"))
		if err != nil {
			return nil, err
		}
		if boolArg(args, "recursive") {
			if err := os.RemoveAll(target); err != nil {
				return nil, err
			}
		} else {
			if err := os.Remove(target); err != nil {
				return nil, err
			}
		}
		return map[string]any{"path": target, "deleted": true}, nil
	default:
		return nil, errors.New("unsupported filesystem operation")
	}
}

func resolvePath(root, p string) (string, error) {
	if strings.TrimSpace(p) == "" {
		p = "."
	}
	var target string
	if filepath.IsAbs(p) {
		target = filepath.Clean(p)
	} else {
		target = filepath.Join(root, p)
	}
	target, err := filepath.Abs(target)
	if err != nil {
		return "", err
	}
	if !strings.HasPrefix(target, root) {
		return "", errors.New("path escapes ADKBOT_FS_ROOT")
	}
	return target, nil
}
