import"./chunk-EQDQRRRY.js";var s=`# stateful-observable.component

\`\`\`mermaid
---
title: Component dataflow
---
graph LR
    subgraph Sources
        subgraph Injected
            direction LR
            Source_clientsApi["
                clientsApi
            "]
            Source_bucketApi["
                bucketApi
            "]
            Source_allProducts$("
                allProducts$
            ")
        end
        subgraph Inputs
            direction LR
            Source_clientId("
                clientId
            ")
            Source_showBucket("
                showBucket
            ")
        end
    end
    subgraph Processing
        Processing_clientId$("
            clientId$
        ")
        Processing_client$("
            client$
        ")
        Processing_bucket$("
            bucket$
        ")
        Processing_populatedBucket$("
            populatedBucket$
        ")
        Processing_showBucket@{ shape: f-circ, label: "Junction" }
    end
    subgraph Consumers
        subgraph TemplateRead
            direction LR
            Consumer_client$("
                client$
                x3
            ")
            Consumer_showBucket["
                showBucket
            "]
            Consumer_populatedBucket$("
                populatedBucket$
                x2
            ")
        end
    end
    Sources ~~~ Processing
    Processing ~~~ Consumers
    Source_showBucket --> Processing_showBucket
    Source_clientId --> Processing_clientId$
    Processing_clientId$ --> Processing_client$
    Source_clientsApi --> Processing_client$
    Processing_clientId$ --> Processing_bucket$
    Source_bucketApi --> Processing_bucket$
    Processing_bucket$ --> Processing_populatedBucket$
    Source_allProducts$ --> Processing_populatedBucket$
    Processing_showBucket --> Consumer_showBucket
    Processing_client$ --> Consumer_client$
    Processing_populatedBucket$ --> Consumer_populatedBucket$

\`\`\`


## Legend
\`\`\`mermaid

graph TB
  Common["Common"]
  Reactive("Reactive")
  Reactive_writable("Reactive writable")
  Mutable["Mutable"]

  style Mutable fill:#500  
  style Reactive_writable fill:#430
\`\`\`
`;export{s as default};
