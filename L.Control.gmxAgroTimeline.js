L.Control.gmxAgroTimeline = L.Control.extend({
    includes: L.Mixin.Events,
    options: {
        position: 'bottomright',
        id: 'agrotimeline',
        isActive: false
    },

    setActive: function (active, skipEvent) {
    },

    onAdd: function (map) {
    },

    onRemove: function (map) {
    },

    addTo: function (map) {
        return this;
    }
});

L.control.gmxAgroTimeline = function (options) {
  return new L.Control.gmxAgroTimeline(options);
};
