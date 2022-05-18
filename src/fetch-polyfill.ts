import fetch, {Headers, Request, Response} from 'node-fetch'
import FormData from 'form-data';

if (!globalThis.fetch) {
  globalThis.fetch = fetch as any
  globalThis.Headers = Headers as any
  globalThis.Request = Request as any
  globalThis.Response = Response as any
  globalThis.FormData = FormData as any
}
