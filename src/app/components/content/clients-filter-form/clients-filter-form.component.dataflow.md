# clients-filter-form.component

```mermaid
---
title: Component dataflow
---
graph LR
    subgraph Sources
        subgraph Injected
            Source_fb["
                fb
            "]
        end
    end
    subgraph Processing
        Processing_filters["
            filters
        "]
    end
    subgraph Consumers
        subgraph Output
            Consumer_formValue$["
                formValue$
            "]
        end
        subgraph TemplateRead
            Consumer_filters["
                filters
            "]
        end
    end
    Sources ~~~ Processing
    Processing ~~~ Consumers
    Source_fb --> Processing_filters
    Processing_filters --> Consumer_formValue$
    Processing_filters --> Consumer_filters

```

