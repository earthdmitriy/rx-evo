import"./chunk-EQDQRRRY.js";var s=`# infinite-scroll.component

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
            Source_formValue$.next["
                formValue$.next
            "]
            Source_stream.reload["
                stream.reload
                x2
            "]
            Source_pageRequest$.next["
                pageRequest$.next
            "]
        end
    end
    subgraph Processing
        Processing_formValue$("
            formValue$
        ")
        Processing_pageRequest$("
            pageRequest$
        ")
        Processing_query$("
            query$
        ")
        Processing_page$("
            page$
        ")
        Processing_stream["
            stream
        "]
    end
    subgraph Consumers
        subgraph TemplateRead
            direction LR
            Consumer_stream.pending$("
                stream.pending$
                x3
            ")
            Consumer_page$("
                page$
                x3
            ")
            Consumer_stream.error$("
                stream.error$
                x2
            ")
            Consumer_stream.value$("
                stream.value$
                x3
            ")
        end
    end
    Sources ~~~ Processing
    Processing ~~~ Consumers
    Source_formValue$.next --> Processing_formValue$
    Source_stream.reload --> Processing_stream
    Source_pageRequest$.next --> Processing_pageRequest$
    Processing_formValue$ --> Processing_query$
    Processing_pageRequest$ --> Processing_query$
    Processing_query$ --> Processing_page$
    Processing_query$ --> Processing_stream
    Source_clientApiService --> Processing_stream
    Processing_stream --> Consumer_stream.pending$
    Processing_page$ --> Consumer_stream.pending$
    Processing_stream --> Consumer_page$
    Processing_page$ --> Consumer_page$
    Processing_stream --> Consumer_stream.error$
    Processing_page$ --> Consumer_stream.error$
    Processing_stream --> Consumer_stream.value$
    Processing_page$ --> Consumer_stream.value$
    style Processing_formValue$ fill:#430
    style Processing_pageRequest$ fill:#430

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
