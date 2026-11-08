---
layout: post
title: "Garbage Collection in Different Languages: A 10-Year Retrospective"
title_description: Written January 2017, revisited November 2026.
description: 'A 10-year retrospective (2017 to 2026) on how garbage collection and memory management work in C, Go, Java, JavaScript, Lisp, Python and Rust, and what changed.'
---

<div id="top"></div>

Garbage collection is the automatic process of memory management. A garbage collector tries to clear up any unused memory or "garbage" to save space for a program. Different languages sometimes have different ways of handling garbage collection with some lower level languages relying on you to handle memory management on your own. I decided to put together a quick rundown of how garbage collection and/or memory management is handled in different languages. It's interesting to see the differences between the languages.

> **Update (November 2026):** I originally wrote this in January 2017. Almost ten years later I've turned it into a retrospective: each language keeps the explanation of how its memory management works, followed by a "2017 → 2026" section on what changed in between. I also fixed a few mistakes in the original and added Go and Rust. Sources for everything new are at the bottom.

* [C](#c)
* [Go](#go)
* [Java](#java)
* [JavaScript](#javascript)
* [Lisp](#lisp)
* [Python](#python)
* [Rust](#rust)

## C

In standard C, garbage collection must be done by the programmer. By using malloc() and free(), you are able to allocate and free memory as you need it. This can lead to performance gains over regular garbage collection since your program won't need to spend the time going through all the objects to see what can be freed. On the other hand, you lose the automatic heap compaction (moving live objects next to each other) that some languages with built-in garbage collection get. The benefit of object locality from spending the time and memory on a garbage collector can sometimes lead to faster performance in the long run. It depends on the size of the program and other variables to determine which performs better.

There are libraries for C that do exist to handle garbage collection such as The Boehm-Demers-Weiser GC Library. It's still maintained, and development now happens on GitHub (bdwgc). The Boehm GC uses a modified mark-sweep algorithm that utilizes four phases:

1. Preparation: Clear the mark bit on every single object.
2. Mark Phase: Set the mark bit on every reachable object.
3. Sweep Phase: Scan the heap for any objects that don't have their mark bit set and return to the free list.
4. Finalization Phase: Any unreachable objects are enqueued for finalization. Finalization is the ability to execute user code right before an object is collected. This allows the system to reclaim any system resources or non-garbage-collected memory associated with the object.

Because C doesn't tell the collector which words in memory are pointers, the Boehm GC is conservative: anything that looks like it could be a pointer into the heap is treated as one. Since it can't be sure whether a value is really a pointer, it can't safely move objects and rewrite pointers to them, so you don't get the compaction mentioned above.

### 2017 → 2026

* **The language barely changed.** The current standard, C23 (ISO/IEC 9899:2024), still leaves memory to you. Among its additions are `free_sized()` and `free_aligned_sized()`, which let you tell the allocator how big the block you're freeing was. That's a performance hint for the allocator, not automatic memory management.
* **The Boehm GC is still around.** Its home page lists 8.2.8 as the current stable release, and development now happens on GitHub.
* **The bigger change was outside the language.** In February 2024 the White House Office of the National Cyber Director published "Back to the Building Blocks", a report making the case that technology manufacturers can keep entire classes of vulnerabilities out of their software by adopting memory safe programming languages. Manual memory management went from being mostly a performance trade-off to being part of a security conversation, and that's one of the reasons [Rust](#rust) got so much attention.

##### [back to top](#top)

## Go

Go wasn't in the original version of this post, so this section is all new. Go has a garbage collector built into its runtime. It's a tracing collector that uses mark-sweep, the same basic idea as the [JavaScript](#javascript) section: starting from the roots, mark every value that can still be reached, then free everything that wasn't marked. Two things make it different from the [Java](#java) collectors:

* It does most of its work concurrently with your program instead of stopping everything while it runs.
* It's non-moving. Live objects stay where they are, so there's no compaction step.

Go also tries to avoid creating garbage in the first place. The compiler runs escape analysis on every value: if it can prove a value doesn't outlive the function that created it, the value goes on the goroutine's stack and is freed automatically when the function returns. Only values that "escape to the heap" are the garbage collector's problem. You can see the compiler's decisions with `go build -gcflags=-m` (or `-m=3` for more detail).

There are two main knobs for tuning it:

* `GOGC` sets how much the heap can grow before the next collection, as a percentage of the live heap plus the GC roots (goroutine stacks and globals). The default is `GOGC=100`, so with 8 MiB of live heap and 2 MiB of stacks and globals, the next collection starts after roughly another 10 MiB is allocated. `GOGC=off` turns the collector off entirely.
* `GOMEMLIMIT` (added in Go 1.19) sets a soft limit on the total memory the Go runtime uses, which makes the collector run more often as you get close to it.

### 2017 → 2026

* **2017: short pauses.** Go 1.5 (2015) had introduced the concurrent, tri-color mark-sweep collector, with pauses well under its 10 millisecond goal. Go 1.8 (February 2017) removed the stop-the-world stack re-scanning step, and its release notes said pauses should usually be under 100 microseconds and often as low as 10.
* **2022: a memory limit.** Go 1.19 added `GOMEMLIMIT`, so you can tell the runtime how much memory it's allowed to use instead of only tuning `GOGC`. That's especially useful in containers with a hard memory limit.
* **2026: Green Tea.** The "Green Tea" collector became the default in Go 1.26 (February 2026). It still uses mark-sweep, but instead of scanning objects one at a time as it finds them, it works through memory a page at a time, which uses the CPU cache much better. The Go team expects a 10–40% reduction in garbage collection overhead for programs that lean on the collector heavily, though results vary.

##### [back to top](#top)

## Java

In Java, garbage collection is performed automatically by the garbage collector located in the execution engine of the JVM. The higher level steps for garbage collection are as follows:

1. The garbage collector marks every block of memory as either in use or not in use.
2. All the unreferenced objects are removed; leaving pointers to free space, the JVM's memory allocator gets these pointers to use when allocating new objects. To improve performance, the remaining objects are compacted (moved closer to one another) to make new memory allocation faster.

The JVM breaks up the heap into "generations". These generations are: Young, and Old. There used to be a "Permanent" generation but as discussed below, no longer exists.

When objects are newly created they are placed in the young generation. The JVM assumes that most objects in the young generation get unreferenced soon after creation. This usually means that when it's time to garbage collect the young generation, most of the objects get collected. The old generation is for objects that have been around for longer. The permanent generation (when it was used) contained metadata the JVM needed to describe all the classes and methods in the application. I go into more detail about how the different generations interact in the following paragraphs.

The young generation is divided into three spaces: Eden and two "survivor" spaces. Newly created objects are placed in Eden. Once Eden is filled, garbage collection is triggered, all in-use objects are sent to Survivor Space 1 with an age of "1" and all unreferenced objects are deleted. On the next garbage collection, any referenced objects from both Eden and Survivor Space 1 are sent to Survivor Space 2 and have their ages incremented by 1. This continues for every garbage collection; all referenced objects from Eden and the current Survivor Space are moved to the other Survivor Space and have their ages incremented.

Once an object has passed the threshold age set by the JVM, it is moved from the Survivor Space to the Old Generation. This gets garbage collected much less frequently since it takes longer to fill up. The downside to this is that when it does get garbage collected it is much slower than the garbage collection of the young generation. This is because most of the objects dealt with by the garbage collector for the old generation are still in use.

The permanent generation was removed in JDK 8, released in March 2014. Class metadata is now stored in native memory, in an area called "Metaspace", instead of on the Java heap. By default the amount of native memory it can use is unlimited, but you can cap it with `-XX:MaxMetaspaceSize`. It is still affected by garbage collection so when a class is unloaded due to garbage collection, the metadata is de-allocated as well. When a certain threshold of metadata storage is reached, the metadata is garbage collected. This threshold can be set by you, but also automatically raises and lowers based on the total space used by Metaspace.

### 2017 → 2026

The Eden/survivor description above is how the classic HotSpot collectors (Serial and Parallel) lay out the heap, and in January 2017, with JDK 8 current, Parallel was still the default for server machines. Java's collectors changed more than any other language in this post:

* **G1 became the default.** G1 became the default collector in JDK 9 (released September 21, 2017). Instead of one big contiguous young and old generation, G1 splits the heap into many equally sized regions. Some regions act as Eden, some as survivor space, and some as old generation, so the generational idea above still applies, just per region. G1 tries to meet a pause-time goal by choosing which regions to collect.
* **CMS is gone.** The Concurrent Mark Sweep collector was removed in JDK 14.
* **ZGC** is a low-latency collector that does most of its work concurrently with the application. It arrived as an experiment in JDK 11 and became a product feature in JDK 15. It became generational in JDK 21, generational mode became the default in JDK 23, and the old non-generational mode was removed in JDK 24.
* **Shenandoah** is another low-pause collector. It does its evacuation (moving objects) concurrently with the application, with the goal of keeping pause times independent of heap size. It arrived as an experiment in JDK 12, became a product feature in JDK 15, and its generational mode became a product feature in JDK 25.

The interesting part is the full circle: ZGC and Shenandoah both started out non-generational, and both ended up adding generations back. The generational ZGC proposal's reasoning is the same "young objects tend to die young" idea the 2017 section describes.

The garbage collection process of Java is the same as any language that uses the JVM and doesn't implement its own garbage collector. Languages like Clojure, Scala, Groovy and Kotlin (on the JVM) use whichever JVM collector the program is started with.

##### [back to top](#top)

## JavaScript

JavaScript's garbage collector uses a "Mark-and-sweep" algorithm to handle the issue of reference cycles. [See Python for a more in-depth explanation of reference cycles.](#python) MDN notes that no modern JavaScript engine uses reference counting anymore.

Mark-and-sweep works by doing the following:

1. Starting from the global JavaScript object, find all objects referenced by it.
2. Continue a search of any objects referenced by these etc.
3. Collect any objects that weren't reached and delete them.

This handles reference cycles by avoiding the problem completely. In a reference cycle, an object has a circle reference to itself with no other objects referencing it. This means that the global object has no reference to the object so it's deemed unreachable.

My original version of this post said objects had to be made explicitly unreachable or they would never be collected. That was wrong. An object is collected once nothing reachable refers to it, and that usually happens on its own: local variables stop being reachable when the function that declared them returns. Reassigning a variable also drops the reference to its old value:

{% highlight javascript %}
var Person = function() {
	this.name = "John";
};
var temp = new Person();
temp = 7; // the Person object we created the line above is now unreachable
{% endhighlight %}

Where you do have to be careful is anything that stays reachable for the life of the page, like global variables, caches, or event listeners you never remove. In old non-strict code it was easy to accidentally create a global variable by doing this:

{% highlight javascript %}
function foo() {
	bar = "global variable";
}
{% endhighlight %}

and instead you should do this:

{% highlight javascript %}
function foo() {
	const bar = "local variable";
}
{% endhighlight %}

Otherwise they'll never be garbage collected, besides the other problems it can cause. Today this is much less of a trap: in strict mode, assigning to an undeclared variable throws a `ReferenceError`, and JavaScript modules are always in strict mode.

### 2017 → 2026

Real engines are more complicated than plain mark-and-sweep. V8 (used in Chrome and Node.js) uses a generational collector called Orinoco, built on the same "most objects die young" idea as the JVM. The young generation uses a semi-space design: live objects are copied out of one half into the other, so half of the young generation is always empty. The major collector for the old generation marks, sweeps and compacts.

* **2018: moving work off the main thread.** Concurrent marking, one of Orinoco's big changes, shipped in Chrome 64 (and Node.js 10), doing marking on background threads while JavaScript keeps running. V8 measured it cutting the marking time on the main thread by 60–70%.
* **2021: weak references.** `WeakMap` and `WeakSet` already held their keys weakly, and since 2021 there are also `WeakRef` and `FinalizationRegistry`. MDN recommends avoiding the last two where possible because there are almost no guarantees about when, or if, the engine will collect an object or run the callback.

The basic model I described in 2017 is still how you should think about it as a developer: if it's reachable it stays, if it isn't it eventually goes.

##### [back to top](#top)

## Lisp

There have been many different implementations of Lisp over the years but we'll be looking at Common Lisp which was created around 1985 and still in use today. A common garbage collection scheme used in Lisp implementations is a two-space system. After a certain amount of memory allocation, the garbage collector is triggered and does the following:

1. It walks from all of the available object roots to every reachable object.
2. Copies all reachable objects from the current memory space to the new space.
3. Updates all of the pointers to point to the new objects.
4. Marks everything in the old space as free.

There are also other implementations that handle garbage collection differently in Lisp. For example, [CMUCL](https://cmucl.org) uses the two-space collector on non-x86 platforms but a generational collector on x86 platforms. It is very similar to the generational collector described in the [Java](#java) section with some minor differences. Some of those differences are:

* Uses six generations.
* "Mostly-copies", which means that if the collector is unsure if the memory location contains a reference, it leaves it in place and promotes it to the next generation. It won't copy it to a new area.

In practice every Common Lisp implementation has a garbage collector, and most if not all of them use some form of either the two-space or generational collector.

### 2017 → 2026

Lisp changed the least of anything here, which makes sense for a language standardized decades ago. SBCL, which forked from CMUCL in December 1999 and is now one of the most widely used open source Common Lisps, still uses the same style of generational, mostly-copying collector by default. The one notable addition: since SBCL 2.3.8 (August 2023) there is an optional parallel mark-region collector that you can choose when building SBCL. It marks in parallel and avoids moving objects.

##### [back to top](#top)

## Python

Python (meaning CPython, the standard implementation) uses both reference counting and an automatic garbage collector to handle memory management. Reference counting works by using a number to keep track of how many times an object is being referenced. Once this value hits zero we know it is no longer needed and can be freed.

If reference counting can handle freeing up any unused objects than why does Python also need a garbage collector? This is because of reference cycles. Reference cycles happen when an object refers to itself, increasing the reference count but breaking the logic of reference counting. As an example:

{% highlight python %}
l = []       # the list's reference count is 1 (the name l)
l.append(l)  # the list now refers to itself: reference count is 2
del l        # the name is gone, reference count drops to 1, but nothing can reach the list
{% endhighlight %}

As you can see, the list can no longer be accessed even though the reference count is greater than 0. This doesn't happen often, but it can still cause issues on longer running programs like servers and lead to memory leaks. This is where the garbage collector comes in. The garbage collector goes through and tries to find any unreachable objects caused by reference cycles and destroy them. Since only container objects (lists, dicts, class instances and so on) can be part of a reference cycle, you can't refer an integer or a string to itself, it keeps track of all container objects using doubly linked lists. Any containers created are stored in this list and removed when they need to be deleted.

In order to find the reference cycles, the garbage collector goes through the following steps using temporary reference counters:

1. For each container object, find which container objects it references and decrement the referenced container's temporary reference count.
2. All container objects that still have a temporary reference count greater than zero are referenced from outside the set of container objects. We cannot free these objects so we move them to a different set.
3. Any objects referenced from the objects moved also cannot be freed. We move them and all the objects reachable from them too.
4. Objects left in our original set are referenced only by objects within that set (ie. they are inaccessible from Python and are garbage). We can now go about freeing these objects.

The tracked containers are split into three generations, the same "most objects die young" idea as Java, so the youngest objects get checked most often.

Python also exposes the garbage collector if you want to disable it by calling gc.disable() or call it manually with gc.collect(). There are also other methods that allow you to get stats about the garbage collector as well as other options.

### 2017 → 2026

* **Python 2 reached end of life.** Python 2 was sunset on January 1, 2020, so everything in this section is about Python 3 now.
* **`gc.freeze()` (3.7).** Moves every object currently tracked into a permanent generation that future collections ignore. It's meant for servers that `fork()` worker processes: the docs suggest disabling the collector early in the parent, freezing right before forking and re-enabling it in the children, which stops the children's collections from touching the parent's long-lived objects, which keeps more memory shared between processes.
* **Immortal objects (3.12).** Some objects, like `None`, `True` and small integers, are now "immortal": their reference count never changes and they are never freed while the interpreter is running.
* **Free-threaded Python (3.13, officially supported in 3.14).** CPython can now be built without the GIL. That build uses a different collector: it is not generational, it pauses all other threads while it runs, and instead of linked lists it finds tracked objects by scanning the mimalloc heap it allocates from.
* **The 3.14 incremental collector, and its rollback.** Python 3.14.0 shipped a new incremental collector with only two generations, to cut pause times on large heaps. After reports of high memory use in production, Python 3.14.5 went back to the three-generation collector from 3.13.

##### [back to top](#top)

## Rust

Rust also wasn't in the original post. It doesn't have a garbage collector, and you don't call malloc() and free() yourself like in [C](#c) either. Memory is managed through a system of ownership with rules that the compiler checks; if your code breaks a rule, it doesn't compile. The rules are:

1. Each value in Rust has an owner.
2. There can only be one owner at a time.
3. When the owner goes out of scope, the value will be dropped.

"Dropped" means Rust automatically calls `drop` for the value at the closing curly bracket of the owner's scope, which is where its memory (and anything else it holds, like a file handle) is cleaned up. Since the compiler knows exactly where every value's owner goes out of scope, there's nothing left to do at runtime: no tracing, no pauses.

To use a value without taking ownership of it you borrow it with a reference. The borrow checker enforces two more rules: at any given time you can have either one mutable reference or any number of immutable references, and references must always be valid. That second rule means the compiler won't let a reference outlive the data it points to, so you can't end up with a dangling pointer the way you can in C.

When a value really does need more than one owner, like a node in a graph, Rust gives you reference counting in the standard library instead of a collector:

* `Rc<T>` keeps a count of how many owners a value has and drops it when the count reaches zero. It's only for use within a single thread.
* `Arc<T>` ("atomically reference counted") does the same thing but updates the count with atomic operations, so it can be shared between threads. That's slower, so the docs recommend `Rc<T>` when you don't need to share across threads.

This brings back the same problem [Python](#python) has: reference cycles. Two `Rc` values that point at each other will never reach a count of zero, so they leak. Rust doesn't have a cycle collector to clean that up. Instead you break the cycle yourself with `Weak<T>`, a reference that doesn't count toward ownership (for example a child node pointing back at its parent). The Rust book is upfront that preventing memory leaks entirely is not one of Rust's guarantees, and that leaks are considered memory safe.

### 2017 → 2026

* **The ownership model didn't change.** Ownership, borrowing, `Rc` and `Arc` all worked the same way in 2017. What changed is how pleasant the borrow checker is to work with.
* **2018: non-lexical lifetimes.** Non-lexical lifetimes (NLL) landed with the Rust 2018 edition. They base a borrow's lifetime on the program's control flow instead of the enclosing block. Code that was obviously fine but used to be rejected (like borrowing a value again after the last use of an earlier borrow, still inside the same block) started compiling.
* **Memory safety became policy.** The 2024 White House report from the [C](#c) section recommends memory safe languages in general rather than naming one, but Rust is the one on this list that gets memory safety without a garbage collector.

##### [back to top](#top)

## Ten years on

Looking back across all seven languages, none of them abandoned the basic ideas from 2017. Tracing collectors still mark what's reachable and throw away the rest, generations are still the main trick (even the Java collectors that tried to do without them added them back), and reference counting still needs help with cycles. What changed is mostly where the work happens: the JVM, Go and V8 collectors now do much of their work on background threads, and Rust does its memory management in the compiler at build time instead of with a collector at run time.

##### [back to top](#top)

---

#### References

Original sources (2017):

* <http://arctrix.com/nas/python/gc/>
* <https://bugs.openjdk.org/browse/JDK-8046112>
* <https://cmucl.org>
* <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Memory_management>
* <https://docs.oracle.com/javase/8/docs/technotes/guides/vm/gctuning/>
* <https://docs.python.org/3/library/gc.html>
* <https://hboehm.info/gc/gcdescr.html>
* <https://homes.cs.washington.edu/~djg/papers/analogy_oopsla07.pdf>
* <http://john.freml.in/sbcl-optimise-gc>
* <https://www.lispworks.com/documentation/HyperSpec/Front/index.htm>
* <https://www.oracle.com/webfolder/technetwork/tutorials/obe/java/gc01/index.html>
* <https://people.cs.umass.edu/~emery/pubs/04-17.pdf>

Added in the November 2026 retrospective:

* C: [A garbage collector for C and C++ (Boehm GC home page)](https://www.hboehm.info/gc/)
* C: [free_sized, cppreference (C23)](https://www.cppreference.com/c/memory/free_sized)
* C: [free_aligned_sized, cppreference (C23)](https://cppreference.com/c/memory/free_aligned_sized)
* C: [ONCD press release: Back to the Building Blocks (February 26, 2024)](https://bidenwhitehouse.archives.gov/oncd/briefing-room/2024/02/26/press-release-technical-report)
* Go: [Getting to Go: Go 1.5 GC, Go blog (2015)](https://go.dev/blog/go15gc)
* Go: [Go 1.8 Release Notes](https://go.dev/doc/go1.8)
* Go: [Release History (go1.8 released 2017-02-16)](https://go.dev/doc/devel/release)
* Go: [A Guide to the Go Garbage Collector](https://go.dev/doc/gc-guide)
* Go: [runtime package documentation (GOGC)](https://pkg.go.dev/runtime)
* Go: [Go 1.26 Release Notes: New garbage collector](https://go.dev/doc/go1.26)
* Go: [The Green Tea Garbage Collector, Go blog (2025)](https://go.dev/blog/greenteagc)
* Java: [JEP 122: Remove the Permanent Generation](https://openjdk.org/jeps/122)
* Java: [Other Considerations: Class Metadata, Java SE 25 GC Tuning Guide](https://docs.oracle.com/en/java/javase/25/gctuning/other-considerations.html)
* Java: [JDK 9 project page (GA 21 September 2017)](https://openjdk.org/projects/jdk9/)
* Java: [JEP 248: Make G1 the Default Garbage Collector (JDK 9)](https://openjdk.org/jeps/248)
* Java: [Garbage-First (G1) Garbage Collector, Java SE 25 GC Tuning Guide](https://docs.oracle.com/en/java/javase/25/gctuning/garbage-first-g1-garbage-collector1.html)
* Java: [JEP 333: ZGC: A Scalable Low-Latency Garbage Collector (Experimental) (JDK 11)](https://openjdk.org/jeps/333)
* Java: [JEP 377: ZGC: A Scalable Low-Latency Garbage Collector (Production) (JDK 15)](https://openjdk.org/jeps/377)
* Java: [JEP 189: Shenandoah: A Low-Pause-Time Garbage Collector (Experimental) (JDK 12)](https://openjdk.org/jeps/189)
* Java: [JEP 363: Remove the Concurrent Mark Sweep (CMS) Garbage Collector (JDK 14)](https://openjdk.org/jeps/363)
* Java: [JEP 439: Generational ZGC (JDK 21)](https://openjdk.org/jeps/439)
* Java: [JEP 474: ZGC: Generational Mode by Default (JDK 23)](https://openjdk.org/jeps/474)
* Java: [JEP 490: ZGC: Remove the Non-Generational Mode (JDK 24)](https://openjdk.org/jeps/490)
* Java: [JEP 379: Shenandoah: A Low-Pause-Time Garbage Collector (Production) (JDK 15)](https://openjdk.org/jeps/379)
* Java: [JEP 521: Generational Shenandoah (JDK 25)](https://openjdk.org/jeps/521)
* JavaScript: [Memory management, MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Memory_management)
* JavaScript: [Strict mode, MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Strict_mode)
* JavaScript: [Concurrent marking in V8, V8 blog (2018)](https://v8.dev/blog/concurrent-marking)
* JavaScript: [Trash talk: the Orinoco garbage collector, V8 blog (2019)](https://v8.dev/blog/trash-talk)
* JavaScript: [WeakRef, MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakRef)
* Lisp: [History of SBCL](https://www.sbcl.org/history.html)
* Lisp: [SBCL 2.3.8 release announcement (mark-region collector)](https://groups.google.com/g/sbcl-announce/c/zl3OgJJumTc)
* Lisp: [Parallel garbage collection for SBCL, Hayley Patton (2023)](https://zenodo.org/records/7816398)
* Python: [Sunsetting Python 2, python.org](https://www.python.org/doc/sunset-python-2/)
* Python: [gc module documentation (gc.freeze)](https://docs.python.org/3/library/gc.html)
* Python: [Garbage collector design, CPython InternalDocs](https://github.com/python/cpython/blob/main/InternalDocs/garbage_collector.md)
* Python: [PEP 683: Immortal Objects, Using a Fixed Refcount (3.12)](https://peps.python.org/pep-0683/)
* Python: [PEP 779: Criteria for supported status for free-threaded Python](https://peps.python.org/pep-0779/)
* Python: [What's New In Python 3.14: Garbage collection](https://docs.python.org/3/whatsnew/3.14.html)
* Rust: [What Is Ownership?, The Rust Programming Language](https://doc.rust-lang.org/book/ch04-01-what-is-ownership.html)
* Rust: [References and Borrowing, The Rust Programming Language](https://doc.rust-lang.org/book/ch04-02-references-and-borrowing.html)
* Rust: [Rc&lt;T&gt;, the Reference Counted Smart Pointer, The Rust Programming Language](https://doc.rust-lang.org/book/ch15-04-rc.html)
* Rust: [Reference Cycles Can Leak Memory, The Rust Programming Language](https://doc.rust-lang.org/book/ch15-06-reference-cycles.html)
* Rust: [std::sync::Arc documentation](https://doc.rust-lang.org/std/sync/struct.Arc.html)
* Rust: [Non-Lexical Lifetimes (NLL) Working Group, Rust compiler team](https://rust-lang.github.io/compiler-team/working-groups/nll/)
