import"./chunk-EQDQRRRY.js";var o=`# Stateful-observable\r
\r
## Idea\r
**Purpose:** the final solution. History and design decisions: [ADR](https://github.com/earthdmitriy/stateful-observable/blob/main/docs/adr.md).\r
\r
Client and bucket each get their own root: \`statefulObservable(clientId$)\` turns the input into a stream of loading, value and error states. \`pipeValue\` maps only successes, \`pipeError\` only failures, and \`combineStatefulObservables\` merges bucket and products. \`app-stateful-block\` renders loading, error with Retry, or the projected content. Products come from the root \`allProductsToken\`.\r
\r
## Good\r
- One primitive for every block; the template is just a block plus its content.\r
- Blocks are independent, and old data stays (dimmed) while a new id loads, so there is no layout jump.\r
- Errors keep their meaning: the block shows the message mapped by \`pipeError\` ("Can't load bucket", "Can't load products").\r
- Every block has a working Retry, and it refetches only what failed: \`reload({ onlyFailed: true })\` skips healthy sources of the combine, and separate roots keep the client out of a bucket retry.\r
- Products are fetched once and shared through the token (\`shareReplay(1)\`); a hidden bucket is not fetched.\r
- The component holds only pure mappings: no \`subscribe\`, no mutable state, and \`switchMap\` cancels outdated requests.\r
\r
## Bad\r
- It is a separate library to learn and maintain.\r
\r
## Try it\r
- Turn on **Throw** on the Bucket API: only the bucket block shows the alert with **Retry**; the client card keeps updating. Turn the toggle off, **Reset counters** and press **Retry**: only the Bucket counter moves.\r
- Products load once per app, so to see them fail: open another sample first (e.g. [Combine](/optimized/combine)), turn on **Throw** on the Products API, then come back here. The bucket block shows "Can't load products"; turn the toggle off, **Reset counters**, press **Retry**: only Products moves.\r
- With products loaded, **Throw** on the Products API changes nothing: the shared catalog is not requested again.\r
- Turn **Autoincrement** off and click **Next client**: the old card stays dimmed until the new one arrives.\r
\r
## Next step\r
The list samples at [Pagination](/x/pagination) apply the same primitive to harder screens.\r
`;export{o as default};
