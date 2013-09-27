define(function(){
  return function(css) {
    it('should have a space before opening braces', function(){
      /[a-zA-Z0-9]+\{/gm.test(css).should.be.false;
    })
    it('should put opening braces on selector lines', function(){
      /^\s*\{/gm.test(css).should.be.false;
    })
    it('should put expressions on a new line', function(){
      /\{.+/gm.test(css).should.be.false;
    })
    it('should end expressions with a semicolon', function(){
      /\n [^\*].*:.*[^;{\/\*]\n/gm.test(css).should.be.false;
    })
    it('should put closing braces on a new line', function(){
      /\S+\}/gm.test(css).should.be.false;
    })
    it('should put a space after expression colons', function(){
      /(\{|;)\s*\n\s+[\S]+:[\S]+/gm.test(css).should.be.false;
    })
    it('should put only one space after expression colons', function(){
      /(\{|;)\s*\n\s+[\S]+:  +/gm.test(css).should.be.false;
    })
    it('should put only one expression per line', function(){
      /\;.+:.*;?/gm.test(css).should.be.false;
    })
    it('should indent expressions 4 spaces', function(){
      /(\{|;)\s*\n[a-z-A-Z0-9]+/gm.test(css).should.be.false;
    })
  }
})