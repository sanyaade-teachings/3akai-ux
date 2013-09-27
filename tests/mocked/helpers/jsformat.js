define(function(){
  return function(js) {
    it('should have no console.(log|warn|error|debug|trace) statements', function(){
      /console\.(?:log|warn|error|debug|trace)/g.test(js).should.be.false;
    })
    it('should have no alert() calls', function(){
      /alert\([.\s\S]*\)/g.test(js).should.be.false;
    })
    it('should have no double quotation marks other than within single quotation marks', function(){
      /(?!\'.*)\".*\"(?!.*')/gm.test(js).should.be.true;
    })
    it('should use \"var <functionName> = function() {\"', function(){
      /^\s*function\s.*/gm.test(js).should.be.false;
    })
    it('should put opening braces on the same line as the statement', function(){
      /\)\s*$(\n|\r)^\s*\{.*/gm.test(js).should.be.false;
    })
    it('should use exactly one space before an opening brace', function(){
      /.+\)(\s{0}|\s{2,})\{/gm.test(js).should.be.false;
    })
    it('should not put whitespace after an opening brace', function(){
      /.*\).*\{( |\t)+(\n|\r)/gm.test(js).should.be.false;
    })
    it('should not put whitespace after a closing brace', function(){
      /.*\}( |\t)+(\n|\r)/gm.test(js).should.be.false;
    })
    it('should use literal notation', function(){
      /new\s+(Object|Array|Number|String|Boolean).*/gm.test(js).should.be.false;
    })
    it('should use \"===\" instead of \"==\"', function(){
      /[^=!]==[^=]/gm.test(js).should.be.false;
    })
    it('should use \"!==\" instead of \"!=\"', function(){
      /!=[^=]/gm.test(js).should.be.false;
    })
    it('should use \"var <ALLCAPS>\" instead of \"const\"', function(){
      /^\s*const\s/gm.test(js).should.be.false;
    })
    it('should use \".on()\" and \".off()\" to attach event handlers', function(){
      /\.(live|die|bind|unbind)\(/gm.test(js).should.be.false;
    })
    it('should not extend prototypes', function(){
      /\.prototype\..*=/gm.test(js).should.be.false;
    })
    it.skip('should avoid using Object.freeze, Object.preventExtensions, Object.seal, with, eval', function(){
      /(^|\s)(Object\.(freeze|preventExtensions|seal)|eval|((?!['"].*)(with)(?!.*['"])))(\s|$)/gm.test(js).should.be.false;
    })
    it('should use jquery or underscore for type checking', function(){
      /(^|\s)typeof(\s|$)/gm.test(js).should.be.false;
    })
  }
})