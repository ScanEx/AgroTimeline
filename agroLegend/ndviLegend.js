var NDVILegend = function (options) {
    inheritance.base(this, options);

    this.events = new Events(["loadend"]);

    this.palettes = [];

    var defArr = [],
        that = this;
    for (var i = 0; i < options.palettes.length; i++) {
        (function (ii) {
            var def = new $.Deferred();
            defArr.push(def);
            shared.loadPaletteSync(options.palettes[ii].url).then(function (pal) {
                that.palettes[ii] = {
                    'min': options.palettes[ii].min || 0.0,
                    'max': options.palettes[ii].max || 1.0,
                    'scale': pal,
                    'isStatic': options.palettes[ii].isStatic != undefined ? options.palettes[ii].isStatic : true
                };
                def.resolve();
            });
        })(i);
    }

    $.when.apply($, defArr).then(function () {
        that.events.dispatch(that.events.loadend, that);
    });
};

inheritance.extend(NDVILegend, Legend);