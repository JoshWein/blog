---
layout: default
title: Garbage Collection in Different Languages (in progress)
---

Garbage collection is an interesting topic and a good way to learn about the benefits of using certain languages. So how is garbage collection handled in different languages?

* [Java](#java)

## Java

In Java, garbage collection is performed automatically by the garbage collector located in the execution engine of the JVM. The higher level steps for garbage collection are as follows:

1. The garbage collector marks every block of memory as either in use or not in use.
2. All the unreferenced objects are removed; leaving pointers to free space, the JVM's memory allocator gets these pointers to use when allocating new objects. To improve performance, the remaining objects are compressed(moved closer to one another) to make new memory allocation faster.

The JVM breaks up the heap into "generations". These generations are: Young, and Old. There used to be a "Permanent" generation but as discussed below, no longer exists.

When objects are newly created they are placed in the young generation. The JVM assumes that most objects in the young generation get unreferenced soon after creation. This usually means that when it's time to garbage collect the young generation, most of the objects get collected. The old generation is for objects that have been around for longer. The permanent generation(when it was used) contained metadata the JVM needed to describe all the classes and methods in the application. I go into more detail about how the different generations interact in the following paragraphs.

The young generation is divided into three spaces: Eden and two "survivor" spaces. Newly created objects are placed in Eden. Once Eden is filled, garbage collection is triggered, all in-use objects are sent to Survivor Space 1 with an age of "1" and all unreferenced objects are deleted. On the next garbage collection, any referenced objects from both Eden and Survivor Space 1 are sent to Survivor Space 2 and have their ages incremented by 1. This continues for every garbage collection; all referenced objects from Eden and the current Survivor Space are moved to the other Survivor Space and have their ages incremented.

Once an object has passed the threshold age set by the JVM, it is moved from the Survivor Space to the Old Generation. This gets garbage collected much less frequently since it takes longer to fill up. The downside to this is that when it does get garbage collected it is much slower than the garbage collection of the young generation. This is because most of the objects dealt with by the garbage collector for the old generation are still in use.

The permanent generation no longer exists in JDK 8. In 2014, the JVM was updated to no longer need the permanent generation. All class metadata is now stored in native memory, with a tag "Metaspace" with unlimited space. It is still affected by garbage collection so when a class is unloaded due to garbage collection, the metadata is de-allocated as well. When a certain threshold of metadata storage is reached, the metadata is garbage collected. This threshold can be set by you, but also automatically raises and lowers based on the total space used my Metaspace.

---

#### References

* <http://bugs.openjdk.java.net/browse/JDK-8046112>
* <http://docs.oracle.com/javase/8/docs/technotes/guides/vm/gctuning>
* <http://www.oracle.com/webfolder/technetwork/tutorials/obe/java/gc01/index.html>
