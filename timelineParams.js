var timelineParams = {
    proxyUrl: '',
    exMap: { host: "maps.kosmosnimki.ru", name: "PLDYO" },
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
            name: "8288D69C7C0040EFBB7B7EE6671052E3",
            mask: "A05BB0207AEE4CFD93C045BF71576FDE",
            //name: "2E9D38607BB4456AB9C04E2248ED5015",
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
            isSentinel: true,
            cloudsMin: 100,
            showQuicklooks: true,
            cloudsField: "clouds",
            viewTimeline: true,
            name: "636CBFF5155F4F299254EAF54079040C",
            dateColumnName: "acqdate"
        },
        "SENTINEL_NDVI": {
            isSentinel: true,
            name: "EC68D0C097BE4F0B9E9DE4A0B9F591A2",
            mask: "14A988CBC5FD424D9EBE23CEC8168150",
            //name: "2DFFD2B32C754770BD7D289AB8986CC4",
            dateColumnName: "acqdate",
            palette: {
                ndvi: {
                    url: 'http://maps.kosmosnimki.ru/api/plugins/palettes/NDVI_interp_legend.icxleg.xml',
                    prodtype: "NDVI"
                }
            }
        },
        "SENTINEL_IR": {
            isSentinel: true,
            showQuicklooks: true,
            cloudsField: "clouds",
            name: "12ECA8F4ED7B487A913ADBD4072B605B",
            dateColumnName: "acqdate"
        },
        "RGB": {
            cloudsMin: 100,
            showQuicklooks: true,
            cloudsField: "CLOUDS",
            viewTimeline: true,
            name: "04DDB23F49F84B9A9122CBA6BC26D3ED",
            dateColumnName: "ACQDATE"
        },
        "LANDSAT_PREVIEW": {
            viewTimeline: true,
            showQuicklooks: false,
            cloudsField: "clouds",
            name: "D8CFA7D3A7AA4549B728B37010C051A2",
            dateColumnName: "acqdate"
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
        },
        "MODIS143": {
            viewTimeline: true,
            name: "509762F05B0044D8A7CCC9D3C2383365",
            dateColumnName: "acqdate"
        },
        "EVERYDAY250": {
            viewTimeline: true,
            name: "02BA2ACF5B26491681EBAD888771FC55",
            dateColumnName: "date",
            palette: {
                ndvi: {
                    url: 'http://maps.kosmosnimki.ru/api/plugins/palettes/NDVI_interp_legend.icxleg.xml',
                }
            }
        },
        "EVERYDAY250_QUALITY": {
            sceneFieldName: "sceneid",
            name: "94B096994CBA47D889C1077C669BC466",
            dateColumnName: "date",
            palette: {
                quality: {
                    url: 'http://maps.kosmosnimki.ru/api/plugins/ndvipublic/legend/QC_grade_1-5.icxleg',
                }
            }
        }
    },
    combo: [{
        resolution: "modis",
        caption: "Композиты/16дн, 250м",
        rk: ["MODIS", "MODIS_QUALITY"]
    }, {
        resolution: "landsat",
        clouds: true,
        cloudsMin: 100,
        caption: "Космосъемка 10-30 м",
        rk: ["HR", "RGB", "RGB2", "CLASSIFICATION", "SENTINEL", "SENTINEL_NDVI", "SENTINEL_IR", "LANDSAT_PREVIEW"]
    }, {
        caption: "Космосъемка 250 м",
        resolution: "modis",
        rk: ["MODIS143"]
    }, {
        caption: "Композиты/8дн, 250м",
        resolution: "modis",
        rk: ["EVERYDAY250", "EVERYDAY250_QUALITY"]
    }, {
        caption: "Пожары",
        rk: ["FIRES"]
    }]
};