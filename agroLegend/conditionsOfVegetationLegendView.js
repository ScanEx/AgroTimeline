var ConditionsOfVegetationLegendView = function () {
    inheritance.base(this, new Legend({
        'width': 480,
        'height': 220,
        'name': "Индекс условий вегетации"
    }));

    this.template =
    '<div style="top:50%; left: 50%; margin-left:-210px; margin-top: -77px; position: absolute; width: 152px">\
       <table class="legendTable" style="width:300px">\
         <tbody>\
           <tr>\
             <td><div class="legendColorh" style="background-color:rgb(0, 128, 0); margin-left: 0; margin-right: 0;width:{cellWidth};"></div></td>\
             <td> - существенно лучше среднего многолетнего</td>\
           </tr>\
           <tr>\
             <td><div class="legendColorh" style="background-color:rgb(0, 255, 0); margin-left: 0; margin-right: 0;width:{cellWidth};"></div></td>\
             <td> - лучше среднего многолетнего</td>\
           </tr>\
           <tr>\
             <td><div class="legendColorh" style="background-color:rgb(255, 255, 0); margin-left: 0; margin-right: 0;width:{cellWidth};"></div></td>\
             <td> - близко к среднему многолетнему</td>\
           </tr>\
           <tr>\
             <td><div class="legendColorh" style="background-color:rgb(255, 128, 128); margin-left: 0; margin-right: 0;width:{cellWidth};"></div></td>\
             <td> - хуже среднего многолетнего</td>\
           </tr>\
           <tr>\
             <td><div class="legendColorh" style="background-color:rgb(255, 0, 0); margin-left: 0; margin-right: 0;width:{cellWidth};"></div></td>\
             <td> - существенно хуже среднего многолетнего</td>\
           </tr>\
         </tbody>\
       </table>\
     </div>';

    this.render = function () {
        this.$el = $($.parseHTML(replaceSubstring(this.template, {
            'cellWidth': "30px"
        })));
        this.el = this.$el[0];

        return this;
    };

    this.initialize();
};

inheritance.extend(ConditionsOfVegetationLegendView, LegendView);