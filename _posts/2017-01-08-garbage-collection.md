---
layout: post
title: Garbage Collection in Different Languages (in progress)
---

Garbage collection is an interesting topic and a good way to learn about the benefits of using certain languages. So how is garbage collection handled in different languages?

<div id="top"></div>

* [C](#c)
* [Java](#java)
* [Python](#python)

## C

In standard C, garbage collection must be done by the programmer. By using malloc() and free(), you are able to allocate and free memory as you need it. This can lead to performance gains over regular garbage collection since your program won't need to spend the time going through all the objects to see what can be freed. On the other hand, you lose the automated object compression that other languages with built-in garbage collection get. The benefit of object locality from spending the time and memory on a garbage collector can sometimes lead to faster performance in the long run. It depends on the size of the program and other variables to determine which performs better.

There are libraries for C that do exist to handle garbage collection such as The Boehm-Demers-Weiser GC Library. The Boehm GC uses a modified mark-sweep algorithm that utilizes four phases:

1. Preparation: Clear the mark bit on every single object.
2. Mark Phase: Set the mark bit on every reachable object.
3. Sweep Phase: Scan the heap for any objects that don't have their mark bit set and return the to the free list.
4. Finalization Phase: Any unreachable objects are enqueued for finalization. Finalization is the ability to execute user code right before an object is collected. This allows the system to reclaim any system resources or non-garbage-collected memory associated with the object.

##### [back to top](#top)

## Java

In Java, garbage collection is performed automatically by the garbage collector located in the execution engine of the JVM. The higher level steps for garbage collection are as follows:

1. The garbage collector marks every block of memory as either in use or not in use.
2. All the unreferenced objects are removed; leaving pointers to free space, the JVM's memory allocator gets these pointers to use when allocating new objects. To improve performance, the remaining objects are compressed(moved closer to one another) to make new memory allocation faster.

The JVM breaks up the heap into "generations". These generations are: Young, and Old. There used to be a "Permanent" generation but as discussed below, no longer exists.

When objects are newly created they are placed in the young generation. The JVM assumes that most objects in the young generation get unreferenced soon after creation. This usually means that when it's time to garbage collect the young generation, most of the objects get collected. The old generation is for objects that have been around for longer. The permanent generation(when it was used) contained metadata the JVM needed to describe all the classes and methods in the application. I go into more detail about how the different generations interact in the following paragraphs.

The young generation is divided into three spaces: Eden and two "survivor" spaces. Newly created objects are placed in Eden. Once Eden is filled, garbage collection is triggered, all in-use objects are sent to Survivor Space 1 with an age of "1" and all unreferenced objects are deleted. On the next garbage collection, any referenced objects from both Eden and Survivor Space 1 are sent to Survivor Space 2 and have their ages incremented by 1. This continues for every garbage collection; all referenced objects from Eden and the current Survivor Space are moved to the other Survivor Space and have their ages incremented.

Once an object has passed the threshold age set by the JVM, it is moved from the Survivor Space to the Old Generation. This gets garbage collected much less frequently since it takes longer to fill up. The downside to this is that when it does get garbage collected it is much slower than the garbage collection of the young generation. This is because most of the objects dealt with by the garbage collector for the old generation are still in use.

The permanent generation no longer exists in JDK 8. In 2014, the JVM was updated to no longer need the permanent generation. All class metadata is now stored in native memory, with a tag "Metaspace" with unlimited space. It is still affected by garbage collection so when a class is unloaded due to garbage collection, the metadata is de-allocated as well. When a certain threshold of metadata storage is reached, the metadata is garbage collected. This threshold can be set by you, but also automatically raises and lowers based on the total space used my Metaspace.

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
2. All container objects that now have a reference counte greater than one are referenced from outside the set of container objects. We cannot free these objects so we move them to a different set.
3. Any objects referenced from the objects moved also cannot be freed. We move them and all the objects reachable from them too.
5. Objects left in our original set are referenced only by objects within that set (ie. they are inaccessible from Python and are garbage). We can now go about freeing these objects.

Python also exposes the garbage collector if you want to disable it by calling gc.disable() or call it manually with gc.collect(). There are also other mothods that allow you to get stats about the garbage collector as well as other options.

##### [back to top](#top)

---

#### References

* <http://arctrix.com/nas/python/gc/>
* <http://bugs.openjdk.java.net/browse/JDK-8046112>
* <http://docs.oracle.com/javase/8/docs/technotes/guides/vm/gctuning>
* <http://docs.python.org/3/library/gc.html>
* <http://homes.cs.washington.edu/~djg/papers/analogy_oopsla07.pdf>
* <http://people.cs.umass.edu/~emery/pubs/04-17.pdf>
* <http://svn.python.org/view/python/trunk/Modules/gcmodule.c?revision=81029&view=markup>
* <http://www.hboehm.info/gc/gcdescr.html>
* <http://www.oracle.com/webfolder/technetwork/tutorials/obe/java/gc01/index.html>
