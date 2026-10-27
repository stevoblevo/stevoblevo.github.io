# Blot

An ink blot opens from the middle of an element to reveal it: for a new look, a found thing, the first picture of a chapter.

**Provide** the element to reveal and call `Storeybrook.blot(host, {duration})`. It masks the element with a blot shape that grows from nothing to past its edges over `dur-bleed` (or `duration`), and resolves its Promise when it has opened.

- Reveal something that is ready: the element is masked while it opens, so it should already hold its content.
- Under reduced motion (and in Ink Blot) it shows the element at once.

**Do / Don't**
- Do use one blot per moment, on the thing that is new.
- Don't blot text a person is reading, or loop it.
