# generic-error.component

```mermaid
---
title: Component dataflow
---
graph LR
    subgraph Sources
        subgraph Inputs
            direction LR
            Source_text("
                text
            ")
            Source_showReload("
                showReload
            ")
        end
        subgraph TemplateWrite
            direction LR
            Source_reload.next["
                reload.next
            "]
        end
    end
    subgraph Processing
        Processing_text@{ shape: f-circ, label: "Junction" }
        Processing_showReload@{ shape: f-circ, label: "Junction" }
        Processing_reload@{ shape: f-circ, label: "Junction" }
    end
    subgraph Consumers
        subgraph Output
            direction LR
            Consumer_reload["
                reload
            "]
        end
        subgraph TemplateRead
            direction LR
            Consumer_text["
                text
            "]
            Consumer_showReload["
                showReload
            "]
        end
    end
    Sources ~~~ Processing
    Processing ~~~ Consumers
    Source_text --> Processing_text
    Source_showReload --> Processing_showReload
    Source_reload.next --> Processing_reload
    Processing_text --> Consumer_text
    Processing_showReload --> Consumer_showReload
    Processing_reload --> Consumer_reload

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
