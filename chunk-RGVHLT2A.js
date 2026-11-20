import"./chunk-GAL4ENT6.js";var s=`# infinite-scroll.component\r
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
            Source_formValue$.next["\r
                formValue$.next\r
            "]\r
            Source_stream.reload["\r
                stream.reload\r
                x2\r
            "]\r
            Source_pageRequest$.next["\r
                pageRequest$.next\r
            "]\r
        end\r
    end\r
    subgraph Processing\r
        Processing_formValue$("\r
            formValue$\r
        ")\r
        Processing_pageRequest$("\r
            pageRequest$\r
        ")\r
        Processing_query$("\r
            query$\r
        ")\r
        Processing_page$("\r
            page$\r
        ")\r
        Processing_stream["\r
            stream\r
        "]\r
    end\r
    subgraph Consumers\r
        subgraph TemplateRead\r
            direction LR\r
            Consumer_stream.pending$("\r
                stream.pending$\r
                x3\r
            ")\r
            Consumer_page$("\r
                page$\r
                x3\r
            ")\r
            Consumer_stream.error$("\r
                stream.error$\r
                x2\r
            ")\r
            Consumer_stream.value$("\r
                stream.value$\r
                x3\r
            ")\r
        end\r
    end\r
    Sources ~~~ Processing\r
    Processing ~~~ Consumers\r
    Source_formValue$.next --> Processing_formValue$\r
    Source_stream.reload --> Processing_stream\r
    Source_pageRequest$.next --> Processing_pageRequest$\r
    Processing_formValue$ --> Processing_query$\r
    Processing_pageRequest$ --> Processing_query$\r
    Processing_query$ --> Processing_page$\r
    Processing_query$ --> Processing_stream\r
    Source_clientApiService --> Processing_stream\r
    Processing_stream --> Consumer_stream.pending$\r
    Processing_page$ --> Consumer_stream.pending$\r
    Processing_stream --> Consumer_page$\r
    Processing_page$ --> Consumer_page$\r
    Processing_stream --> Consumer_stream.error$\r
    Processing_page$ --> Consumer_stream.error$\r
    Processing_stream --> Consumer_stream.value$\r
    Processing_page$ --> Consumer_stream.value$\r
    style Processing_formValue$ fill:#430\r
    style Processing_pageRequest$ fill:#430\r
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
`;export{s as default};
