import"./chunk-EQDQRRRY.js";var o=`# Login / Logout\r
\r
## Idea\r
**Purpose:** show invalidation of *derived* data streams. With vanilla RxJS, a derived stream shared with \`shareReplay(1)\` keeps the previous user's value after logout and hands it to every subscriber until a new value arrives; clearing it needs messy workarounds (completing every subscriber, rebuilding the chain, or a "cleared" marker in the value type). Here only the root stream gets \`active: false\`; everything derived from it, including streams behind \`shareReplay(1)\`, goes inactive with it, and after the next login nothing of the previous user is shown, not even for a moment.\r
\r
Three root \`InjectionToken\`s: \`loggedInToken\` (a \`BehaviorSubject<boolean>\`), \`profileToken\` (the client API with \`active: loggedIn$\` and no input: in a real app the server knows the user from the session cookie; here the loader picks a random client) and \`profileBucketToken\` (the profile's bucket, requested inside the profile's chain with \`pipeValue(switchMap(...))\`, combined with the public product catalog). \`app-stateful-block\` shows an empty "signed out" slot while its stream is inactive, and shows its content only after a value of the current session has arrived.\r
\r
## Good\r
- One flag invalidates everything: only the profile has \`active\`; the bucket and the combination with products inherit its state and go inactive together. Nothing is unsubscribed or rebuilt.\r
- The dependent bucket follows the profile's state: pending from the moment of login (while the profile and then the bucket load), and it can never pair a new profile with the previous user's bucket.\r
- Logout cancels requests in flight; their answers never arrive.\r
- The next login is a different user and loads from scratch: going inactive clears the result cache, so no previous answer is reused.\r
- The block wipes its slot on inactive and keeps it empty until the new session's value arrives, although the template's \`value$ | async\` still holds the old user's data (inactive is not emitted on \`value$\`).\r
- The session lives in root tokens: leaving the page and coming back keeps the logged-in state and the loaded data.\r
- The products catalog stays public: it is loaded once and not refetched on relogin.\r
\r
## Try it\r
- **Log in**: the profile card and the bucket appear; the **Requests** panel shows one Client and one Bucket request.\r
- **Log out**: both blocks are wiped at once, and the form gets new random credentials.\r
- Set **API speed** to **Slow**, **Log in**, then **Log out** before the card appears: the Client request is counted as cancelled.\r
- **Log in** again: a different client; the old card never shows while loading.\r
- Turn on **Throw** on the Bucket API and log in: only the bucket block fails, the profile card stays. Turn it off and press **Retry**: the bucket is part of the profile's chain, so Retry reloads from the profile (one Client and one Bucket request, no Products request). With the random loader that is a different client; with a real session cookie it would be the same user.\r
- Open another sample and come back: still logged in, nothing reloads.\r
\r
## Next step\r
You have reached the end of the path. Go back to the [Overview](/) or browse the [scenario docs](https://github.com/earthdmitriy/rx-evo/blob/master/docs/reactive_patterns/README.md).\r
`;export{o as default};
