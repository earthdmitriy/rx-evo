import"./chunk-EQDQRRRY.js";var c=`# chaos.component

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
            Source_productsApi["
                productsApi
            "]
        end
        subgraph Inputs
            direction LR
            Source_clientId["
                clientId
            "]
            Source_showBucket["
                showBucket
            "]
        end
    end
    subgraph Processing
        Processing_client["
            client
        "]
        Processing_bucket["
            bucket
        "]
        Processing_products["
            products
        "]
        Processing_ready["
            ready
        "]
        Processing_displayData["
            displayData
        "]
        Processing_showBucket@{ shape: f-circ, label: "Junction" }
    end
    subgraph Consumers
        subgraph TemplateRead
            direction LR
            Consumer_ready["
                ready
                x2
            "]
            Consumer_displayData.clientInfo["
                displayData.clientInfo
            "]
            Consumer_showBucket["
                showBucket
            "]
            Consumer_displayData.bucket["
                displayData.bucket
            "]
        end
    end
    Sources ~~~ Processing
    Processing ~~~ Consumers
    Source_showBucket --> Processing_showBucket
    Processing_showBucket --> Consumer_showBucket
    Processing_ready --> Consumer_ready
    Processing_displayData --> Consumer_displayData.clientInfo
    Processing_displayData --> Consumer_displayData.bucket
    style Source_clientId fill:#500
    style Source_showBucket fill:#500
    style Processing_client fill:#500
    style Processing_bucket fill:#500
    style Processing_products fill:#500
    style Processing_ready fill:#500
    style Processing_displayData fill:#500

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
`;export{c as default};
