import"./chunk-EQDQRRRY.js";var r=`# virtual-scroll.component

\`\`\`mermaid
---
title: Component dataflow
---
graph LR
    subgraph Sources
        subgraph Injected
            direction LR
            Source_clientApiService["
                clientApiService
            "]
        end
        subgraph TemplateWrite
            direction LR
            Source_retry$.next["
                retry$.next
            "]
        end
    end
    subgraph Processing
        Processing_viewport$("
            viewport$
        ")
        Processing_pageSize["
            pageSize
        "]
        Processing_itemHeight["
            itemHeight
        "]
        Processing_pages("
            pages
        ")
        Processing_visiblePages$("
            visiblePages$
        ")
        Processing_visibleCombined$("
            visibleCombined$
        ")
        Processing_stream["
            stream
        "]
        Processing_retry$("
            retry$
        ")
        Processing_rows$["
            rows$
        "]
        Processing_viewportRef["
            viewportRef
        "]
    end
    subgraph Consumers
        subgraph TemplateRead
            direction LR
            Consumer_stream.error$["
                stream.error$
            "]
            Consumer_itemHeight["
                itemHeight
            "]
            Consumer_rows$["
                rows$
            "]
        end
    end
    Sources ~~~ Processing
    Processing ~~~ Consumers
    Source_retry$.next --> Processing_retry$
    Source_clientApiService --> Processing_pages
    Processing_pageSize --> Processing_pages
    Processing_viewport$ --> Processing_visiblePages$
    Processing_pageSize --> Processing_visiblePages$
    Processing_visiblePages$ --> Processing_visibleCombined$
    Processing_pages --> Processing_visibleCombined$
    Processing_stream --> Processing_rows$
    Processing_pageSize --> Processing_rows$
    Processing_stream --> Consumer_stream.error$
    Processing_itemHeight --> Consumer_itemHeight
    Processing_rows$ --> Consumer_rows$
    style Processing_viewport$ fill:#430
    style Processing_retry$ fill:#430

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
`;export{r as default};
