---
layout: post
title: Garbage Collection in Different Languages
---

<div id="top"></div>

Garbage collection is the automatic process of memory management. A garbage collector tries to clear up any unused memory or "garbage" to save space for a program. Different languages sometimes have different ways of handling garbage collection with some lower level languages relying on you to handle memory management on your own. I decided to put together a quick rundown of how garbage collection and/or memory management is handled in different languages. It's interesting to see the differences between the languages.

* [C](#c)
* [Java](#java)
* [JavaScript](#javascript)
* [Lisp](#lisp)
* [Python](#python)

## C

In standard C, garbage collection must be done by the programmer. By using malloc() and free(), you are able to allocate and free memory as you need it. This can lead to performance gains over regular garbage collection since your program won't need to spend the time going through all the objects to see what can be freed. On the other hand, you lose the automated object compression that other languages with built-in garbage collection get. The benefit of object locality from spending the time and memory on a garbage collector can sometimes lead to faster performance in the long run. It depends on the size of the program and other variables to determine which performs better.

There are libraries for C that do exist to handle garbage collection such as The Boehm-Demers-Weiser GC Library. The Boehm GC uses a modified mark-sweep algorithm that utilizes four phases:

1. Preparation: Clear the mark bit on every single object.
2. Mark Phase: Set the mark bit on every reachable object.
3. Sweep Phase: Scan the heap for any objects that don't have their mark bit set and return to the free list.
4. Finalization Phase: Any unreachable objects are enqueued for finalization. Finalization is the ability to execute user code right before an object is collected. This allows the system to reclaim any system resources or non-garbage-collected memory associated with the object.

##### [back to top](#top)

## Java

In Java, garbage collection is performed automatically by the garbage collector located in the execution engine of the JVM. The higher level steps for garbage collection are as follows:

1. The garbage collector marks every block of memory as either in use or not in use.
2. All the unreferenced objects are removed; leaving pointers to free space, the JVM's memory allocator gets these pointers to use when allocating new objects. To improve performance, the remaining objects are compressed (moved closer to one another) to make new memory allocation faster.

The JVM breaks up the heap into "generations". These generations are: Young, and Old. There used to be a "Permanent" generation but as discussed below, no longer exists.

When objects are newly created they are placed in the young generation. The JVM assumes that most objects in the young generation get unreferenced soon after creation. This usually means that when it's time to garbage collect the young generation, most of the objects get collected. The old generation is for objects that have been around for longer. The permanent generation (when it was used) contained metadata the JVM needed to describe all the classes and methods in the application. I go into more detail about how the different generations interact in the following paragraphs.

The young generation is divided into three spaces: Eden and two "survivor" spaces. Newly created objects are placed in Eden. Once Eden is filled, garbage collection is triggered, all in-use objects are sent to Survivor Space 1 with an age of "1" and all unreferenced objects are deleted. On the next garbage collection, any referenced objects from both Eden and Survivor Space 1 are sent to Survivor Space 2 and have their ages incremented by 1. This continues for every garbage collection; all referenced objects from Eden and the current Survivor Space are moved to the other Survivor Space and have their ages incremented.

Once an object has passed the threshold age set by the JVM, it is moved from the Survivor Space to the Old Generation. This gets garbage collected much less frequently since it takes longer to fill up. The downside to this is that when it does get garbage collected it is much slower than the garbage collection of the young generation. This is because most of the objects dealt with by the garbage collector for the old generation are still in use.

The permanent generation no longer exists in JDK 8. In 2014, the JVM was updated to no longer need the permanent generation. All class metadata is now stored in native memory, with a tag "Metaspace" with unlimited space. It is still affected by garbage collection so when a class is unloaded due to garbage collection, the metadata is de-allocated as well. When a certain threshold of metadata storage is reached, the metadata is garbage collected. This threshold can be set by you, but also automatically raises and lowers based on the total space used my Metaspace.

The garbage collection process of Java is the same as any language that uses the JVM and doesn't implement its own garbage collector. Languages like Clojure, Scala and Groovy use the JVM-implemented garbage collector described above.

##### [back to top](#top)

## JavaScript

JavaScript's garbage collector uses a "Mark-and-sweep" algorithm to handle the issue of reference cycles. [See Python for a more in-depth explanation of reference cycles.](#python)

Mark-and-sweep works by doing the following:

1. Starting from the global JavaScript object, find all objects referenced by it.
2. Continue a search of any objects referenced by these etc.
3. Collect any objects that weren't reach and delete them.

This handles reference cycles by avoiding the problem completely. In a reference cycle, an object has a circle reference to itself with no other objects referencing it. This means that the global object has no reference to the object so it's deemed unreachable.

A limitation of garbage collection in JavaScript is that objects must be made explicitly unreachable in order to be garbage collected, otherwise they never will be. Therefore, if you initialize an instance of an object and never use it again in the program it will never be garbage collected. You would have to do something like this:

{% highlight javascript %}
var Person = function() {
	this.name = "John";
};
var temp = new Person();
newPerson = 7; // the  Person object we created the line above gets made unreachable
{% endhighlight %}

This means, that some cases unused objects can pile up and cause memory leaks. You have to be careful not to accidentally create global variables by doing this:

{% highlight javascript %}
function foo() {
	bar = "global variable";
}
{% endhighlight %}

and instead do this:

{% highlight javascript %}
function foo() {
	var bar = "local variable";
}
{% endhighlight %}

Otherwise they'll never be garbage collected, besides the other problems it can cause.

##### [back to top](#top)

## Lisp

There have been many different implementations of Lisp over the years but we'll be looking at Common Lisp which was created around 1985 and still in use today. A common garbage collection scheme used in Lisp implementations is a two-space system. After a certain amount of memory allocation, the garbage collector is triggered and does the following:

1. It walks from all of the available object roots to every reachable object.
2. Copies all reachable objects from the current memory space to the new space.
3. Updates all of the pointers to point to the new objects.
4. Marks everything in the old space as free.

There are also other implementations that handle garbage collection differently in Lisp. For example, [CMUCL](https://www.cons.org/cmucl/) will the two-space collector on non-x86 platforms but use a generational collector on x86 platforms. It is very similar to the generational collector described in the [Java](#java) section with some minor differences. Some of those differences are:

* Uses six generations.
* "Mostly-copies", which means that if the collector is unsure if the memory location contains a reference, it leaves it in place and promotes it to the next generation. It won't copy it to a new area.

Every implementation of Lisp must comply with the Common Lisp ANSI standard and have a garbage collector. Most if not all implementations use some form of either the two-space or generational collector.

##### [back to top](#top)

## Python

Python uses both reference counting and an automatic garbage collector to handle memory management. Reference counting works by using a number to keep track of how many times an object is being referenced. Once this value hits zero we know it is no longer needed and can be freed.

If reference counting can handle freeing up any unused objects than why does Python also need a garbage collector? This is because of reference cycles. Reference cycles happen when an object refers to itself, increasing the reference count but breaking the logic of reference counting. As an example:

{% highlight python %}
l = [] // Set reference count of l to 1
l.append(l) // Increase reference count of l to 2
del l // Decrease reference count of l to 1 but l is also deleted from the program
{% endhighlight %}

As you can see, the list can no longer be accessed even though the reference count is greater than 0. This doesn't happen often, but it can still cause issues on longer running programs like servers and lead to memory leaks. This is where the garbage collector comes in. The garbage collector goes through and tries to find any unreachable objects caused by reference cycles and destroy them. Since only collections can have reference cycles, you can't refer an integer or another primitive type to itself, it keeps track of all container objects using doubly linked lists. Any containers created are stored in this list and removed when they need to be deleted.

In order to find the reference cycles, the garbage collector goes through the following steps using temporary reference counters:

1. For each container object, find which container objects it references and decrement the referenced container's reference count.
2. All container objects that now have a reference count greater than one are referenced from outside the set of container objects. We cannot free these objects so we move them to a different set.
3. Any objects referenced from the objects moved also cannot be freed. We move them and all the objects reachable from them too.
5. Objects left in our original set are referenced only by objects within that set (ie. they are inaccessible from Python and are garbage). We can now go about freeing these objects.

Python also exposes the garbage collector if you want to disable it by calling gc.disable() or call it manually with gc.collect(). There are also other methods that allow you to get stats about the garbage collector as well as other options.

##### [back to top](#top)

---

#### References

* <http://arctrix.com/nas/python/gc/>
* <http://bugs.openjdk.java.net/browse/JDK-8046112>
* <http://cons.org>
* <http://developer.mozilla.org/en-US/docs/Web/JavaScript/Memory_Management>
* <http://docs.oracle.com/javase/8/docs/technotes/guides/vm/gctuning>
* <http://docs.python.org/3/library/gc.html>
* <http://hboehm.info/gc/gcdescr.html>
* <http://homes.cs.washington.edu/~djg/papers/analogy_oopsla07.pdf>
* <http://john.freml.in/sbcl-optimise-gc>
* <http://lispworks.com/documentation/HyperSpec/Front/index.htm>
* <http://oracle.com/webfolder/technetwork/tutorials/obe/java/gc01/index.html>
* <http://people.cs.umass.edu/~emery/pubs/04-17.pdf>
* <http://svn.python.org/view/python/trunk/Modules/gcmodule.c?revision=81029&view=markup>
