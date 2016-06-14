L.Control.gmxAgroTimeline = L.Control.extend({
    includes: L.Mixin.Events,
    options: {
        position: 'bottomright',
        isActive: true
    },

    onAdd: function (map) {
        var container = L.DomUtil.create('div','agrotimeline');
        container.id = "agrotimeline";
        container.style.position = "absolute";
        container.style.bottom = "0px";
        container.style.zIndex = "200000";
        container.style.right = "0px";

        this._ndviTimelineManager = new NDVITimelineManager(map, timelineParams, false, container)
        this._ndviTimelineManager.start();
        return container;
    }
});

L.control.gmxAgroTimeline = function (options) {
    return new L.Control.gmxAgroTimeline(options);
};
