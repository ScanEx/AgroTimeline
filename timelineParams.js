var timelineParams = {
    proxyUrl: '',
    exMap: { host: "maps.kosmosnimki.ru", name: "PLDYO" },
    timelineVisibilityLayerID: "12DC680F9C4E411D8EFB29C3100730F6",
    layers: {
        "MODIS": {
            viewTimeline: true,
            name: "A10C86983EB140019725D00CE3A58833",
            dateColumnName: "date",
            palette: {
                ndvi: {
                    url: 'http://maps.kosmosnimki.ru/api/plugins/palettes/NDVI_interp_legend.icxleg.xml',
                }
            }
        },
        "MODIS_QUALITY": {
            sceneFieldName: "sceneid",
            name: "3471393ADBD546EC9E6D7935F30EA7BA",
            dateColumnName: "date",
            palette: {
                quality: {
                    url: 'http://maps.kosmosnimki.ru/api/plugins/ndvipublic/legend/QC_grade_1-5.icxleg',
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
            showQuicklooks: true,
            cloudsField: "clouds",
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
            showQuicklooks: true,
            viewTimeline: true,
            cloudsField: "CLOUDS",
            name: "04DDB23F49F84B9A9122CBA6BC26D3ED",
            dateColumnName: "ACQDATE"
        },
        "RGB2": {
            showQuicklooks: true,
            cloudsField: "CLOUDS",
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
        }
    },
    combo: [{
        resolution: "modis",
        caption: "Композиты 16 дн",
        rk: ["MODIS", "MODIS_QUALITY"]
    }, {
        resolution: "landsat",
        clouds: true,
        cloudsMin: 50,
        caption: "Космосъемка 10-30 м",
        rk: ["HR", "RGB", "RGB2", "CLASSIFICATION", "SENTINEL", "SENTINEL_NDVI"]
    }, {
        caption: "Пожары",
        rk: ["FIRES"]
    }]
};