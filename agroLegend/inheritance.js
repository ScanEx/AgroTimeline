var inheritance = {};

inheritance.extend = function (Child, Parent) {
    var F = function () { };
    F.prototype = Parent.prototype;
    Child.prototype = new F();
    Child.prototype.constructor = Child;
    Child.superclass = Parent.prototype;
    Child.superclass.constructor = Parent;
};

inheritance.base = function (me) {
    var caller = arguments.callee.caller;
    caller.superclass.constructor.apply(me, Array.prototype.slice.call(arguments, 1));
};