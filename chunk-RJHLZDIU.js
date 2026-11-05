import"./chunk-EQDQRRRY.js";var r=`# login-logout.component

\`\`\`mermaid
---
title: Component dataflow
---
graph LR
    subgraph Sources
        subgraph Injected
            direction LR
            Source_loggedIn$("
                loggedIn$
            ")
            Source_profile["
                profile
            "]
            Source_profileBucket["
                profileBucket
            "]
        end
        subgraph TemplateWrite
            direction LR
            Source_loggedIn$.next["
                loggedIn$.next
                x2
            "]
        end
    end
    subgraph Processing
        Processing_credentials$("
            credentials$
        ")
        Processing_loggedIn$@{ shape: f-circ, label: "Junction" }
        Processing_profile@{ shape: f-circ, label: "Junction" }
        Processing_profileBucket@{ shape: f-circ, label: "Junction" }
    end
    subgraph Consumers
        subgraph TemplateRead
            direction LR
            Consumer_loggedIn$["
                loggedIn$
                x2
            "]
            Consumer_profile.value$["
                profile.value$
                x2
            "]
            Consumer_credentials$("
                credentials$
            ")
            Consumer_profile["
                profile
            "]
            Consumer_profileBucket["
                profileBucket
            "]
            Consumer_profileBucket.value$["
                profileBucket.value$
            "]
        end
    end
    Sources ~~~ Processing
    Processing ~~~ Consumers
    Source_loggedIn$ --> Processing_loggedIn$
    Source_profile --> Processing_profile
    Source_profileBucket --> Processing_profileBucket
    Source_loggedIn$.next --> Processing_loggedIn$
    Source_loggedIn$ --> Processing_credentials$
    Processing_loggedIn$ --> Processing_credentials$
    Processing_credentials$ --> Consumer_loggedIn$
    Processing_loggedIn$ --> Consumer_loggedIn$
    Processing_profile --> Consumer_profile
    Processing_profileBucket --> Consumer_profileBucket
    Processing_profile --> Consumer_profile.value$
    Processing_credentials$ --> Consumer_credentials$
    Processing_profileBucket --> Consumer_profileBucket.value$

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
