import"./chunk-GAL4ENT6.js";var r=`# virtual-scroll.component\r
\r
\`\`\`mermaid\r
---\r
title: Component dataflow\r
---\r
graph LR\r
    subgraph Sources\r
        subgraph Injected\r
            direction LR\r
            Source_clientApiService["\r
                clientApiService\r
            "]\r
        end\r
        subgraph TemplateWrite\r
            direction LR\r
            Source_retry$.next["\r
                retry$.next\r
            "]\r
        end\r
    end\r
    subgraph Processing\r
        Processing_viewport$("\r
            viewport$\r
        ")\r
        Processing_pageSize["\r
            pageSize\r
        "]\r
        Processing_itemHeight["\r
            itemHeight\r
        "]\r
        Processing_pages("\r
            pages\r
        ")\r
        Processing_visiblePages$("\r
            visiblePages$\r
        ")\r
        Processing_visibleCombined$("\r
            visibleCombined$\r
        ")\r
        Processing_stream["\r
            stream\r
        "]\r
        Processing_retry$("\r
            retry$\r
        ")\r
        Processing_rows$["\r
            rows$\r
        "]\r
        Processing_viewportRef["\r
            viewportRef\r
        "]\r
    end\r
    subgraph Consumers\r
        subgraph TemplateRead\r
            direction LR\r
            Consumer_stream.error$["\r
                stream.error$\r
            "]\r
            Consumer_itemHeight["\r
                itemHeight\r
            "]\r
            Consumer_rows$["\r
                rows$\r
            "]\r
        end\r
    end\r
    Sources ~~~ Processing\r
    Processing ~~~ Consumers\r
    Source_retry$.next --> Processing_retry$\r
    Source_clientApiService --> Processing_pages\r
    Processing_pageSize --> Processing_pages\r
    Processing_viewport$ --> Processing_visiblePages$\r
    Processing_pageSize --> Processing_visiblePages$\r
    Processing_visiblePages$ --> Processing_visibleCombined$\r
    Processing_pages --> Processing_visibleCombined$\r
    Processing_stream --> Processing_rows$\r
    Processing_pageSize --> Processing_rows$\r
    Processing_stream --> Consumer_stream.error$\r
    Processing_itemHeight --> Consumer_itemHeight\r
    Processing_rows$ --> Consumer_rows$\r
    style Processing_viewport$ fill:#430\r
    style Processing_retry$ fill:#430\r
\r
\`\`\`\r
\r
\r
## Legend\r
\`\`\`mermaid\r
\r
graph TB\r
  Common["Common"]\r
  Reactive("Reactive")\r
  Reactive_writable("Reactive writable")\r
  Mutable["Mutable"]\r
\r
  style Mutable fill:#500  \r
  style Reactive_writable fill:#430\r
\`\`\`\r
`;export{r as default};
