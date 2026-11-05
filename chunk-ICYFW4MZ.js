import"./chunk-EQDQRRRY.js";var n=`# Multi-subscribe\r
\r
## Warning\r
**This component does not care about changed inputs:** \`clientId\` is read once in \`ngOnInit\`, later values are ignored.\r
\r
## Idea\r
**Purpose:** the race condition of Chaos is mitigated by starting one \`subscribe()\` from inside another, so products are only processed after the bucket has arrived.\r
\r
Observables replace promises, but they are chained by hand: \`subscribe()\` on the bucket calls another \`subscribe()\` for products. Results are stored in fields and \`displayData\` is built in the innermost callback, once.\r
\r
## Good\r
- The race of Chaos is mitigated: products are subscribed from inside the bucket callback, so \`prepareData\` never sees an undefined bucket.\r
- Every request is cancellable in principle, because it is an observable.\r
\r
## Bad\r
- Subscriptions are never stored or unsubscribed \u2192 callbacks run (and write fields) after the component is destroyed.\r
- Client is a separate, unsynchronised subscription: if it arrives after products, \`displayData\` is built with \`client === undefined\` and is never rebuilt.\r
- Bucket and products are a waterfall (bucket time + products time) instead of running in parallel.\r
- No \`ngOnChanges\`: a new \`clientId\` is ignored, the card shows the first client forever.\r
- No error callbacks: any error is unhandled and the skeleton stays.\r
\r
## Try it\r
- Press **Next client** \u2014 nothing is refetched, the card does not change.\r
- Reload the sample a few times: sometimes the client block is empty because the client response came last.\r
- Turn on **Throw** on the Bucket API or **Products** and reload \u2014 the skeleton never goes away.\r
- Compare time to first render with Combine: the two dependent requests run one after another.\r
\r
## Next step\r
[Combine](/optimized/combine) \u2014 \`forkJoin\` loads everything in parallel into one consistent result, with \`takeUntil\` cleanup.\r
`;export{n as default};
