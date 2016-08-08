var timelineParams = {
    proxyUrl: '',
    exMap: { host: "maps.kosmosnimki.ru", name: "PLDYO" },
    layers: {
        "MODIS": {
            viewTimeline: true,
            name: "3AD0B4A220D349848A383D828781DF4C",
            dateColumnName: "lastday",
            palette: {
                ndvi: {
                    url: 'http://maps.kosmosnimki.ru/api/plugins/palettes/NDVI_interp_legend.icxleg.xml',
                    prodtype: "NDVI16"
                },
                quality: {
                    url: 'http://maps.kosmosnimki.ru/api/plugins/ndvipublic/legend/QC_grade_1-5.icxleg',
                    prodtype: "QUALITY16"
                }
            }
        },
        "HR": {
            name: "2E9D38607BB4456AB9C04E2248ED5015",
            dateColumnName: "acqdate",
            palette: {
                ndvi: {
                    url: 'http://maps.kosmosnimki.ru/api/plugins/palettes/NDVI_interp_legend.icxleg.xml',
                    prodtype: "NDVI"
                },
                quality: {
                    url: 'http://maps.kosmosnimki.ru/api/plugins/ndvipublic/legend/legend_class_1-5.icxleg',
                    prodtype: "FIELD"
                }
            }
        },
        "SENTINEL": {
            viewTimeline: true,
            name: "58A10C3522764BA69D2EA75B02E8A210",
            dateColumnName: "acqdate"
        },
        "SENTINEL_NDVI": {
            name: "2DFFD2B32C754770BD7D289AB8986CC4",
            dateColumnName: "acqdate",
            palette: {
                ndvi: {
                    url: 'http://maps.kosmosnimki.ru/api/plugins/palettes/NDVI_interp_legend.icxleg.xml',
                    prodtype: "NDVI"
                }
            }
        },
        "RGB": {
            viewTimeline: true,
            name: "04DDB23F49F84B9A9122CBA6BC26D3ED",
            dateColumnName: "ACQDATE"
        },
        "RGB2": {
            name: "47A9D4E5E5AE497A8A1A7EA49C7FC336",
            dateColumnName: "ACQDATE"
        },
        "CLASSIFICATION": {
            name: "0C94757D72C34876AD1CFEEE9FD8E902",
            dateColumnName: "acqdate",
            palette: {
                classification: {
                    url: 'http://maps.kosmosnimki.ru/api/plugins/ndvipublic/legend/CLASS_grade_1-5.icxleg',
                    prodtype: "CLASSIFICATION"
                }
            }
        },
        "FIRES": {
            name: "F2840D287CD943C4B1122882C5B92565",
            dateColumnName: "DateTime",
            timelineMode: "screen",
            viewTimeline: true
        },
        "OPERATIVE_MODIS_AQUA_NDVI": {
            viewTimeline: true,
            name: "D0EC9464BFBE4A09BA0EEDF983CBBA08",
            dateColumnName: "acqdate",
            palette: {
                ndvi: {
                    url: 'http://maps.kosmosnimki.ru/api/plugins/palettes/NDVI_interp_legend.icxleg.xml',
                }
            }
        },
        "OPERATIVE_MODIS_TERRA_NDVI": {
            viewTimeline: true,
            name: "6CCDFB87663D431CA0B22CCDE4892859",
            dateColumnName: "acqdate",
            palette: {
                ndvi: {
                    url: 'http://maps.kosmosnimki.ru/api/plugins/palettes/NDVI_interp_legend.icxleg.xml',
                }
            }
        }
    },
    combo: [{
        resolution: "modis",
        caption: "Композиты 16 дн",
        rk: ["MODIS"]
    }, {
        caption: "Космосъемка 10-30 м",
        rk: ["HR", "RGB", "RGB2", "CLASSIFICATION", "SENTINEL", "SENTINEL_NDVI"]
    }, {
        caption: "Космосъемка 250 м",
        rk: ["OPERATIVE_MODIS_AQUA_NDVI", "OPERATIVE_MODIS_TERRA_NDVI"]
    }, {
        caption: "Пожары",
        rk: ["FIRES"]
    }]
};