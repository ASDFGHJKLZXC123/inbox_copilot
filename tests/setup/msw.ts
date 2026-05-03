import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";

export const handlers = [
  http.get("https://gmail.googleapis.com/gmail/v1/users/me/profile", () =>
    HttpResponse.json({ emailAddress: "test@example.com" })
  ),
  http.get("https://gmail.googleapis.com/gmail/v1/users/me/threads", () =>
    HttpResponse.json({ threads: [{ id: "t1", snippet: "hi" }] })
  ),
  http.get("https://graph.microsoft.com/v1.0/me", () =>
    HttpResponse.json({
      mail: "test@example.com",
      userPrincipalName: "test@example.com",
      displayName: "Test"
    })
  ),
  http.post("https://api.anthropic.com/v1/messages", () =>
    HttpResponse.json({
      content: [
        {
          type: "text",
          text: '{"headline":"ok","action":"reply","bullets":[]}'
        }
      ]
    })
  ),
  http.post("https://generativelanguage.googleapis.com/v1beta/models/*", () =>
    HttpResponse.json({ candidates: [{ content: { parts: [{ text: "{}" }] } }] })
  )
];

export const server = setupServer(...handlers);
