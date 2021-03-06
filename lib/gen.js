var gen={};

/* A forgetful generator, as simple as it gets! 
  initialize it with:
    a function you'd like to increment
    an optional index to count from
    an optional environment passed as a second argument to the function
      (for more complex behaviour, if needed)
  This is the function to use if you just want a closure with minimal overhead.
  */ 

/* Example usage found in example/forgetful.js */

gen.forget=function(f,i,c){
  // make sure the cache is initialized, 'i' has a default value of 0
  c=c||{i:i||0};
  // return the generator, passing the value of the index
  // and a reference to the cache
  return function(){
    return f(c.i++,c);
  };
};

/* gen.stateful is only slightly more complicated than gen.forget:
  it returns a generator which optionally takes a cache
  meaning you can reinitialize at any time.
  By its very nature, though, it exposes its innards
  and as such it can possibly exhibit dangerous behaviour.
 */

/* Example usage found in example/markov.js */

gen.stateful=function(f,c){
  // no default values for this generator
  // you're expected to do it yourself..
  return function(cache){
    // when a new cache is passed, it overrides the original
    c=cache||c;
    return f(c);
  };
}; 

/* At cjd's request, we want an async loop
  we can reduce boilerplate by passing a generator as a callback */

/*
gen.async=function(fz,d){
  // fz is a generator which wraps an async function which takes a callback
  // d is what happens when you're done
 
  return function(){
    // pass the generator a reference to itself for the next iteration
    return fz(fz,d);
  };
};
 */

/* gen.memo is significantly fancier than the other generators so far
  It's meant to be used in situations where the computation is expensive
  particularly if it relies on recursion.

  At each successive call, the function's return value is pushed to an array
  passing an index to the generator will retrieve that index from the array
  saving any extraneous effort involved in the computation.
  
  If that index has not yet been generated, it will automatically increment
  until it has been generated, then return that value
*/
  
/* Example usage found in example/memoedPrimes.js and example/memoedFibs.js */

gen.memo=function(f,c){
  // initialize the cache with an empty object if it was not passed as an argument
  c=c||{};
  // if the cache does not contain 'i' (its index) initialize it as 'zero'
  c.i=c.i||0;
  // the memoization process depends on an array which can be filled and referenced
  c.memo=c.memo||[];
  // c.last stores the last value which was modified
  c.last=c.last||null;
  // using c.f, you can reference the initial function which was passed (and recurse)
  c.f=f;

  // c.fn is the new function which will be returned (which increments c.f)
  c.fn=function(n){
    if(isNaN(n)){
      c.memo[c.i]=c.last=f(c.i,c);
      c.i++;
      return c.last;
    }else if(c.memo[n]){
      return c.memo[n];
    }else{
      n=Math.floor(n);
      while(typeof c.memo[n] === "undefined"){
        c.fn();
      }
      return c.memo[n];
    }
  };
  // return the memoizing generator
  return c.fn;
};

/* gen.either captures an array in a closure and increments through its members
  and returns undefined when it exceeds its bounds
  It saves you having to create a closure manually in order to lazily index an array
  Everything is done internally, meaning that unless the returned function is stored
  the array will be garbage collected after you are done with it.
*/

/* Example usage found in example/either.js */

gen.either=function(a){
  var i=0;
  return function(){
    return a[i++];
  };
};

/* gen.cycle will also lazily iterate over an array that it has captured in its scope
  however, rather than returned undefined at the end of its array
  it loops back to the beginning when you exceed its bounds
*/

/* Example usage found in example/cycleThrough.js */

gen.cycle=function(a){
  var i=0,l=a.length;
  return function(){
    return a[i++ % l];
  };
};

/* like gen.cycle, but each element is a function which which is called
    its result is returned, and we move onto the next function
    pass it a bunch of lazy generators and you basically have breadth-first search */

/* Example usage found in example/breadth.js */

gen.fcycle=function(a){
  var i=0,l=a.length;
  return function(){
    return a[i++ % l]();
  };
};

/* A general condition under which you probably want your generator to fail */

gen.fail=function(x){
  return typeof x==="undefined";
};

/* The default callback used at the termination of a lazy sequence
    feel free to override with `gen.done=function(){/* .... */

gen.done=function(){return;}; // dead function

/* gen.first generates the first 'n' results of a lazy function.
  'n' defaults to a 1.
  results are returned in an array.
  optionally takes a third argument 'cond', which specifies terms under which
  gen.first should terminate and return its accumulator.
  if no condition is specified, it is assumed that it should fail on 'undefined'
*/

/* Examples can be found in example/
  breadth.js
  chaining.js
  memoedPrimes.js */

gen.first=function(lz,n,cond){
  var i=0; // what element are we currently working on?
  n=n||1; // default number of elements to return
  var acc=[]; // the accumulator you will return
  cond=cond||gen.fail; // default to checking for undefined
  while(n>i++){
    var res=lz();
    if(cond(res))break;
    acc.push(res);
  }
  return acc;
};

/* increment a lazy function, and throw away the results.
    only useful if you're after the side effects and not the results. 
    accepts a condition under which it should terminate
    since your lazy generator is quite likely an infinite one.
  the condition defaults to checking for an undefined result.
 */

gen.all=function(lz,cond){
  cond=cond||gen.fail;
  while(1){
    if(cond(lz()))break;
  }
};

/* just like gen.all, except it returns the results in a list 
  be careful, if it's an infinite list, it will never return.
*/

gen.listall=function(lz,cond){
  cond=cond||gen.fail;
  var acc=[];
  while(1){
    var res=lz();
    if(cond(res))break;
    acc.push(res);
  }
  return acc;
};

/* returns a function which increments a generator
    and returns only the results which satisfy some predicate
  you need to supply a generator
  failure to supply a filtering condition will simply return every element
  the default condition on which it will terminate is an undefined result
*/

/* Example usage in example/filtering.js */

gen.filter=function(lz,sat,cond){
  sat=sat||function(x){return true;};
  cond=cond||gen.fail; // default to checking for an undefined result
  return function(){ // return a generator
    var res=lz(); // which increments the generator you gave it
    while(!cond(res)){ // as long as it fails to meet some terminal condition
      if(sat(res)) // if you find a satisfactory result, return it
        return res;
      res=lz(); // otherwise, keep on looking
    }
    return; // return an undefined result if you reach a terminal condition
  };
};

/* gen.cons returns what is basically the concatenation of two lazy lists
  when the first list fails to return a result, it falls through to the second. 
*/

/* Example usage found in example/fallThrough.js */

gen.cons=function(lz,next,cond,done){
  next=next||gen.done; // return undefined if no second function is provided 
  cond=cond||gen.fail; // default failure behaviour if no terminal condition
  done=done||gen.done; // fail at the end of the second list
  var f=function(){return lz();}; // start by fetching elements from the first list
  var failed=false; // this keeps us from an infinite loop
  var fn=function(){ // the generator we will return
    var res=f(); // get the first result
    if(cond(res)&&failed){ // if we've failed twice, then we're done
      return; // return an undefined result
    }else if(cond(res)){ // otherwise, if we fail, try moving on
      f=function(){return next();} // our generator now uses the second list
      failed=true; // but remember that we failed once
      return fn(); // return the next element
    }else
      return res; // otherwise, we must have a good result, return it
  };
  return fn; // return the handler function
};

/* take an array of generators and return a function which sequences them
    at some terminal condition, it increments the array and uses the next
    basically depth first search... */

/* Example usage in example/chaining.js */

gen.chain=function(F,cond,done){ 
  cond=cond||gen.fail;
  done=done||gen.done;

  var fn=F.concat(done) // add done to the end
    .reverse() // we need to start from the end
      // since the nth function needs to be passed as the 'next' to the (n-1)th
    .reduce(function(next,current){
      return gen.cons(current,next,cond,done); // chain each function together
    });
  return fn; // return the lazy handler you've produced.
};

/* gen.combinatorial has a huge, ugly name
  that's because it's just a temporary model for a better recursive function
  which has not been built yet

  it's a primitive version of a backtracking generator
  use it to lazily find every possible combination of two finite lists
  the first argument 'f' is the 'parent function'
  it's passed into a handler which retrieves its value
  then lazily generates a generator for the second 'child function'

  at each increment, the child function returns:
    the current value of the parent function and the latest child value

  when the child function fails, it will call the parent function
  which generates the next child function
  and then continue using the new child function...
  thus iterating through every possible combination......
  now it just needs to be generalized for any number of lazy lists
  of any type...
  
  it takes an optional condition function, which indicates when it should terminate
  and another optional argument 'done'
  to be executed when the parent function fails.
*/

gen.combinatorial=function(f,g,cond,done){
  cond=cond||gen.fail; // default to a standard fail condition
  done=done||gen.done; // default to a standard callback
  var temp; // a temp variable to store the latest parent value
  var kid; // a variable to store the current child generator
  var fz=gen.either(f); // the parent function
  var failed=false; // track if the parent function has failed
  var par=function(){ // this is the parent function handler
    temp=fz(); // it increments the parent function and stores the value in temp
    if(cond(temp)){ // if the parent function has failed..
      failed=true; // indicate that
      return; // and return
    } // but you still have a child function to pass over
    kid=gen.either(g); // generate it
  };
  par(); // now that the parent handler is defined, increment it
  var fn=function(){ // the main generator you'll return
    var res=kid(); // call the child function and store the result
    if(cond(res)&&failed){ // if both generators have failed
      return done(); // then you're done
    }else if(cond(res)){ // if just the child has failed
      par(); // regenerate the child array
      return fn(); // return the next child value
    }else{ // otherwise.. 
      return [temp,res]; // return the current combined values of parent and child
    }
  }; // end of generator function
  return fn; // now return it and start using it
};

// if you are not using these functions within the browser
if(typeof module!=="undefined"&&module.exports)
  module.exports=gen; // then export it as a module
