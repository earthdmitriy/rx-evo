# client-bucket.component

```mermaid
---
title: Component dataflow
---
graph LR
    subgraph Sources
        subgraph Inputs
            direction LR
            Source_bucket("
                bucket
            ")
        end
    end
    subgraph Processing
        Processing_bucket@{ shape: f-circ, label: "Junction" }
    end
    subgraph Consumers
        subgraph TemplateRead
            direction LR
            Consumer_bucket["
                bucket
                x2
            "]
        end
    end
    Sources ~~~ Processing
    Processing ~~~ Consumers
    Source_bucket --> Processing_bucket
    Processing_bucket --> Consumer_bucket

```


## Legend
```mermaid

graph TB
  Common["Common"]
  Reactive("Reactive")
  Reactive_writable("Reactive writable")
  Mutable["Mutable"]

  style Mutable fill:#500  
  style Reactive_writable fill:#430
```
