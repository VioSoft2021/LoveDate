// Ambient type declarations for the Deno runtime + npm: imports that
// Supabase Edge Functions use. This file exists ONLY for VS Code's
// TypeScript language service — when Supabase deploys the function,
// Deno provides the real types. Without this shim, opening any file
// in supabase/functions/ in VS Code shows red squiggles on Deno globals
// and on every `npm:...` specifier, even though the function works
// perfectly when deployed.

declare namespace Deno {
  /** HTTP server. Takes a fetch handler and listens on the function port. */
  export function serve(handler: (req: Request) => Response | Promise<Response>): void

  /** Function-secret access. Set via `supabase secrets set KEY=...`. */
  export const env: {
    get(key: string): string | undefined
  }
}

// `npm:` specifier shim. Supabase + Deno resolve these at runtime; the
// TS service just needs to know the module exists. Anthropic SDK shape
// is intentionally loose — we only use `messages.create` and read the
// content array; full types would require importing @anthropic-ai/sdk
// as a real npm dep, which we don't want in the Deno function tree.

declare module 'npm:@anthropic-ai/sdk@*' {
  export interface AnthropicTextBlock {
    type: 'text'
    text: string
  }
  export interface AnthropicToolUseBlock {
    type: 'tool_use'
    id: string
    name: string
    input: unknown
  }
  export type AnthropicContentBlock = AnthropicTextBlock | AnthropicToolUseBlock

  export interface AnthropicMessage {
    id: string
    content: AnthropicContentBlock[]
    stop_reason: string | null
  }

  export interface AnthropicMessagesCreateParams {
    model: string
    max_tokens: number
    system?: string
    messages: Array<{ role: 'user' | 'assistant'; content: string }>
    // Structured-output config (json_schema). Loose typing — Anthropic's
    // structured outputs are still evolving and we don't depend on shape
    // beyond passing it through.
    // deno-lint-ignore no-explicit-any
    output_config?: any
  }

  export default class Anthropic {
    constructor(opts: { apiKey: string })
    messages: {
      create(params: AnthropicMessagesCreateParams): Promise<AnthropicMessage>
    }
  }
}

// Supabase JS client. Only the symbols we actually use are typed —
// the real types come from @supabase/supabase-js at runtime in Deno.
declare module 'npm:@supabase/supabase-js@*' {
  // deno-lint-ignore no-explicit-any
  type SupabaseAny = any
  export function createClient(url: string, key: string, options?: SupabaseAny): SupabaseAny
}

// Other `npm:...` specifiers the functions may use over time.
declare module 'npm:*' {
  // deno-lint-ignore no-explicit-any
  const value: any
  export default value
  // deno-lint-ignore no-explicit-any
  export = value as any
}
