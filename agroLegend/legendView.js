var LegendView = function (legend) {
    this.template = 
        '<div class="legendBar">\
        </div>';

    this.el = null;
    this.$el = null;
    this.model = legend;

    this._renderTemplate = function () {
        this.$el = $($.parseHTML(replaceSubstring(this.template, {})));
        this.el = this.$el[0];
    };

    this._renderBody = function () {
    };

    this.render = function () {
        this._renderTemplate();
        this._renderBody();
        return this;
    };

    this.initialize = function () {
        this.render();
    };
};