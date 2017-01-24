var OdnorodnostLegendView = function () {
    inheritance.base(this, new Legend({
        'name': "Однородность"
    }));

    this.template =
    '<div style="width: 152px">\
       <div style="float:left">низкая</div>\
       <div style="float:right">высокая</div>\
       <table class="legendTable">\
         <tbody>\
           <tr>\
             <td><div class="legendColorh" style="background-color:#f50c32; margin-left: 0; margin-right: 0;width:{cellWidth};"></div></td>\
             <td><div class="legendColorh" style="background-color:#e39139; margin-left: 0; margin-right: 0;width:{cellWidth};"></div></td>\
             <td><div class="legendColorh" style="background-color:#f0f018; margin-left: 0; margin-right: 0;width:{cellWidth};"></div></td>\
             <td><div class="legendColorh" style="background-color:#7deb15; margin-left: 0; margin-right: 0;width:{cellWidth};"></div></td>\
             <td><div class="legendColorh" style="background-color:#1ea312; margin-left: 0; margin-right: 0;width:{cellWidth};"></div></td>\
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

inheritance.extend(OdnorodnostLegendView, LegendView);