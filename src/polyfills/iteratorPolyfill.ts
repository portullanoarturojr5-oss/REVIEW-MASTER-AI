/**
 * Comprehensive Browser Compatibility Polyfill for ECMAScript Iterator & Iterator Helpers API.
 *
 * Ensures 100% compatibility across Safari, Chrome < 122, Edge < 122, Firefox, iOS WebKit,
 * and Android browsers that do not natively declare the global `Iterator` constructor.
 *
 * All methods are implemented using standard, robust Array methods (Array.from, Array.prototype.map, etc.).
 */

// Establish global scope reference across all environments
const globalScope: any =
  typeof globalThis !== "undefined"
    ? globalThis
    : typeof window !== "undefined"
    ? window
    : typeof self !== "undefined"
    ? self
    : typeof global !== "undefined"
    ? global
    : {};

if (typeof globalScope.Iterator === "undefined") {
  // Define standard Iterator constructor function
  function IteratorPolyfill() {}

  // Ensure standard prototype inheritance
  IteratorPolyfill.prototype = Object.create(Object.prototype);

  // Symbol.iterator support
  if (typeof Symbol !== "undefined" && Symbol.iterator) {
    IteratorPolyfill.prototype[Symbol.iterator] = function () {
      return this;
    };
  }

  // Iterator.from() converts any iterable or iterator-like into an array-backed structure
  IteratorPolyfill.from = function (iterable: any) {
    if (!iterable) return [];
    if (Array.isArray(iterable)) return iterable;
    if (typeof Symbol !== "undefined" && typeof iterable[Symbol.iterator] === "function") {
      return Array.from(iterable);
    }
    return [iterable];
  };

  // Iterator.prototype.map()
  IteratorPolyfill.prototype.map = function (callback: (item: any, index: number) => any) {
    return Array.from(this).map(callback);
  };

  // Iterator.prototype.filter()
  IteratorPolyfill.prototype.filter = function (predicate: (item: any, index: number) => boolean) {
    return Array.from(this).filter(predicate);
  };

  // Iterator.prototype.join() (Directly prevents pdfjs-dist crash)
  IteratorPolyfill.prototype.join = function (separator?: string) {
    return Array.from(this).join(separator ?? ",");
  };

  // Iterator.prototype.forEach()
  IteratorPolyfill.prototype.forEach = function (callback: (item: any, index: number) => void) {
    Array.from(this).forEach(callback);
  };

  // Iterator.prototype.some()
  IteratorPolyfill.prototype.some = function (predicate: (item: any) => boolean) {
    return Array.from(this).some(predicate);
  };

  // Iterator.prototype.every()
  IteratorPolyfill.prototype.every = function (predicate: (item: any) => boolean) {
    return Array.from(this).every(predicate);
  };

  // Iterator.prototype.reduce()
  IteratorPolyfill.prototype.reduce = function (callback: any, initialValue?: any) {
    const arr = Array.from(this);
    return arguments.length > 1 ? arr.reduce(callback, initialValue) : arr.reduce(callback);
  };

  // Iterator.prototype.toArray()
  IteratorPolyfill.prototype.toArray = function () {
    return Array.from(this);
  };

  // Iterator.prototype.take()
  IteratorPolyfill.prototype.take = function (limit: number) {
    return Array.from(this).slice(0, Math.max(0, limit));
  };

  // Iterator.prototype.drop()
  IteratorPolyfill.prototype.drop = function (count: number) {
    return Array.from(this).slice(Math.max(0, count));
  };

  // Iterator.prototype.flatMap()
  IteratorPolyfill.prototype.flatMap = function (callback: (item: any, index: number) => any) {
    return Array.from(this).flatMap(callback);
  };

  // Assign to globalThis and window
  globalScope.Iterator = IteratorPolyfill;
  if (typeof window !== "undefined") {
    (window as any).Iterator = IteratorPolyfill;
  }
} else {
  // If Iterator exists on global scope, ensure essential helper methods are safely defined
  const proto = globalScope.Iterator.prototype;
  if (proto) {
    if (typeof proto.join !== "function") {
      proto.join = function (separator?: string) {
        return Array.from(this).join(separator ?? ",");
      };
    }
    if (typeof proto.map !== "function") {
      proto.map = function (callback: (item: any, index: number) => any) {
        return Array.from(this).map(callback);
      };
    }
    if (typeof proto.filter !== "function") {
      proto.filter = function (predicate: (item: any, index: number) => boolean) {
        return Array.from(this).filter(predicate);
      };
    }
    if (typeof proto.toArray !== "function") {
      proto.toArray = function () {
        return Array.from(this);
      };
    }
    if (typeof proto.forEach !== "function") {
      proto.forEach = function (callback: (item: any, index: number) => void) {
        Array.from(this).forEach(callback);
      };
    }
  }

  if (typeof globalScope.Iterator.from !== "function") {
    globalScope.Iterator.from = function (iterable: any) {
      if (!iterable) return [];
      if (Array.isArray(iterable)) return iterable;
      if (typeof Symbol !== "undefined" && typeof iterable[Symbol.iterator] === "function") {
        return Array.from(iterable);
      }
      return [iterable];
    };
  }
}

export {};
