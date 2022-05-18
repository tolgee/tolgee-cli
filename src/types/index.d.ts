declare interface GlobalFetch {
  fetch(input: RequestInfo, init?: RequestInit): Promise<Response>
}
