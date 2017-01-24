var RatingLegendView = function () {
    inheritance.base(this, new Legend({
        'name': "Рейтинг",
        'width': 255
    }));

    this.template =
    '<div style="width: 216px;">\
       <div style="float:left">низкий</div>\
       <div style="float:right">высокий</div>\
       <table class="legendTable">\
         <tbody>\
           <tr>\
             <td><div class="legendColorh" style="background-color:#000000; margin-left: 0; margin-right: 0;width:{cellWidth};"></div></td>\
             <td><div class="legendColorh" style="background-color:#f50c32; margin-left: 0; margin-right: 0;width:{cellWidth};"></div></td>\
             <td><div class="legendColorh" style="background-color:#e39139; margin-left: 0; margin-right: 0;width:{cellWidth};"></div></td>\
             <td><div class="legendColorh" style="background-color:#e6c84e; margin-left: 0; margin-right: 0;width:{cellWidth};"></div></td>\
             <td><div class="legendColorh" style="background-color:#f0f018; margin-left: 0; margin-right: 0;width:{cellWidth};"></div></td>\
             <td><div class="legendColorh" style="background-color:#dfed5c; margin-left: 0; margin-right: 0;width:{cellWidth};"></div></td>\
             <td><div class="legendColorh" style="background-color:#b3d66d; margin-left: 0; margin-right: 0;width:{cellWidth};"></div></td>\
             <td><div class="legendColorh" style="background-color:#7deb15; margin-left: 0; margin-right: 0;width:{cellWidth};"></div></td>\
             <td><div class="legendColorh" style="background-color:#1ea312; margin-left: 0; margin-right: 0;width:{cellWidth};"></div></td>\
           </tr>\
         </tbody>\
       </table>\
     </div>';

    this.render = function () {
        this.$el = $($.parseHTML(replaceSubstring(this.template, {
            'cellWidth': "24px"
        })));
        this.el = this.$el[0];

        return this;
    };

    this.initialize();
};

inheritance.extend(RatingLegendView, LegendView);