import"./chunk-GAL4ENT6.js";var r=`# login-logout.component\r
\r
\`\`\`mermaid\r
---\r
title: Component dataflow\r
---\r
graph LR\r
    subgraph Sources\r
        subgraph Injected\r
            direction LR\r
            Source_loggedIn$("\r
                loggedIn$\r
            ")\r
            Source_profile["\r
                profile\r
            "]\r
            Source_profileBucket["\r
                profileBucket\r
            "]\r
        end\r
        subgraph TemplateWrite\r
            direction LR\r
            Source_loggedIn$.next["\r
                loggedIn$.next\r
                x2\r
            "]\r
        end\r
    end\r
    subgraph Processing\r
        Processing_credentials$("\r
            credentials$\r
        ")\r
        Processing_loggedIn$@{ shape: f-circ, label: "Junction" }\r
        Processing_profile@{ shape: f-circ, label: "Junction" }\r
        Processing_profileBucket@{ shape: f-circ, label: "Junction" }\r
    end\r
    subgraph Consumers\r
        subgraph TemplateRead\r
            direction LR\r
            Consumer_loggedIn$["\r
                loggedIn$\r
                x2\r
            "]\r
            Consumer_profile.value$["\r
                profile.value$\r
                x2\r
            "]\r
            Consumer_credentials$("\r
                credentials$\r
            ")\r
            Consumer_profile["\r
                profile\r
            "]\r
            Consumer_profileBucket["\r
                profileBucket\r
            "]\r
            Consumer_profileBucket.value$["\r
                profileBucket.value$\r
            "]\r
        end\r
    end\r
    Sources ~~~ Processing\r
    Processing ~~~ Consumers\r
    Source_loggedIn$ --> Processing_loggedIn$\r
    Source_profile --> Processing_profile\r
    Source_profileBucket --> Processing_profileBucket\r
    Source_loggedIn$.next --> Processing_loggedIn$\r
    Source_loggedIn$ --> Processing_credentials$\r
    Processing_loggedIn$ --> Processing_credentials$\r
    Processing_credentials$ --> Consumer_loggedIn$\r
    Processing_loggedIn$ --> Consumer_loggedIn$\r
    Processing_profile --> Consumer_profile\r
    Processing_profileBucket --> Consumer_profileBucket\r
    Processing_profile --> Consumer_profile.value$\r
    Processing_credentials$ --> Consumer_credentials$\r
    Processing_profileBucket --> Consumer_profileBucket.value$\r
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
