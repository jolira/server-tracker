var com = com || {};
com.wm = com.wm || {};
com.wm.data = com.wm.data || {};
com.wm.data.Viewer = function(id, url, payload, parameters) {
    dojo.require("dojox.charting.Chart2D");
    dojo.require("dojox.charting.themes.Claro");
    dojo.require("dojox.charting.widget.Legend");
    dojo.require("dojox.charting.action2d.Tooltip");
    dojo.require("dojox.charting.action2d.Magnify");

    this.payload = payload;
    this.serviceUrl = url;
    this.domId = id;

    if (parameters) {
        if (parameters.interval) {
            this.intervalId = "_" + id + "_viewer";
            this.interval = parameters.interval;
            parameters.interval = null;
        }
        if (parameters.zoom) {
            this.zoomParam = zoomParam;
            parameters.zoom = null;
        }
        this.proxyParams = parameters;
    }

    this.onMouseDown = function(event) {
        // _init = {x: e.clientX, y: e.clientY, ox: offsetX, oy: offsetY};
        this._startPct = this.determinePct(event.x);
        dojo.stopEvent(event);
    };

    this.onMouseUp = function(event) {
        var endPct = this.determinePct(event.x);
        var leftPct = endPct > this._startPct ? this._startPct : endPct;
        var rightPct = endPct > this._startPct ? endPct : this._startPct;
        if (leftPct && rightPct) {
            this.zoom(leftPct, rightPct);
        }
        this._startPct = null;
        dojo.stopEvent(event);
    };

    this.zoom = function(lPct, rPct) {
        if (rPct - lPct > .03) {
            var leftX = this.determinePxl(lPct);
            var rightX = this.determinePxl(rPct);
            var scale = 1 / (rPct - lPct);

            if (!this.zoomParam) {
                this.zoomParam = lPct + "," + rPct;
            } else {
                this.zoomParam += ";" + lPct + "," + rPct;
            }

            chart.setWindow(scale, 1, Math.floor(leftX) * scale, 0, {
                duration : 500,
                onEnd : this.render
            }).render();
        }
    },

    this.determinePct = function(xPos) {
        var lOffset = this.chart.offsets.l;
        var rOffset = this.chart.offsets.r;
        var lMargin = this.chart.margins.l;
        var width = dojo.position(this.domId).w;
        var realWidth = width - lOffset - rOffset;
        var realL = xPos - lOffset - lMargin;
        var rtn = realL / realWidth;
        if (rtn < 0) {
            return 0;
        } else if (rtn > 1) {
            return 1;
        } else {
            return rtn;
        }
    };

    this.determinePxl = function(pct) {
        var lOffset = this.chart.offsets.l;
        var rOffset = this.chart.offsets.r;
        var width = dojo.position(this.domId).w;
        var realWidth = width - lOffset - rOffset;
        return pct * realWidth;
    }

    this.render = function() {
        var url = this.serviceUrl + "?";
        if (this.zoomParam) {
            url += "zoom=" + this.zoomParam + "&";
        }
        if (this.stamp) {
            url += "lrt=" + this.stamp + "&";
        }
        if (this.proxyParams) {
            for ( var name in this.proxyParams) {
                url += name + "=" + this.proxyParams[name] + "&";
            }
        }

        var _this = this;

        console.log("Getting data: " + url);
        dojo.xhrPost({
            url : url,
            handleAs : "json",
            postData : dojo.toJson(this.payload),
            load : function(data) {
                if (!data) {
                    alert("The server could not be located right now.");
                    return;
                }

                // reset cache from data
                if (data.zoom) {
                    _this.zoomParam = data.zoom;
                }
                if (data.stamp) {
                    _this.stamp = data.stamp;
                }

                // setup chart
                if (_this.chart) {
                    _this.legend.destroy();
                    _this.legend = null;
                    _this.tip.destroy();
                    _this.tip = null;
                    _this.chart.destroy();
                    _this.chart = null;

                    dojo.disconnect(dojo.byId("chart"), "onmousedown", _this.onMouseDown);
                    dojo.disconnect(dojo.byId("chart"), "onmouseup", _this.onMouseUp);
                }
                _this.chart = new dojox.charting.Chart2D(_this.domId);
                _this.chart.setTheme(dojox.charting.themes.Claro);
                _this.chart.addPlot("default", {
                    type : "Lines",
                    markers : true,
                    tension : 3,
                    shadows : {
                        dx : 2,
                        dy : 2,
                        dw : 2
                    }
                });
                _this.chart.addAxis("y", {
                    vertical : true
                });
                if (_this.interval) {
                    // we'll need a reference for the timer
                    window[_this.intervalId] = _this;
                }
                dojo.connect(dojo.byId("chart"), "onmousedown", _this.onMouseDown);
                dojo.connect(dojo.byId("chart"), "onmouseup", _this.onMouseUp);

                // Create the tooltip
                _this.tip = new dojox.charting.action2d.Tooltip(_this.chart, "default");

                // if (_this.interval)
                // setTimeout("com.wm.data.viewerIntervalRefresh('" +
                // _this.intervalId + "')",
                // this.interval * 1000);

                if (data.stamp) {
                    _this.stamp = data.stamp;
                }
                chart = _this.chart;
                if (chart.getAxis("x")) {
                    chart.removeAxis("x");
                }
                chart.addAxis("x", {
                    labelFunc : function(i) {
                        if (data.labels[i] && data.labels[i] != '') {
                            return data.labels[i];
                        }
                        return ' ';
                    },
                    includeZero : true
                });

                for ( var i in data.data) {
                    chart.removeSeries(i);
                    chart.addSeries(i, data.data[i]);
                }
                chart.render();
                if (!_this.legend) {
                    _this.legend = new dojox.charting.widget.Legend({
                        chart : chart
                    }, "legend");
                }
            },
            error : function(error, xhrProps) {
                alert(error);
            }
        });
    };

    // _.bindAll(this, "onMouseDown", "onMouseUp", "render");
}

com.wm.data.viewerIntervalRefresh = function(id) {
    var obj = window[id];
    if (obj) {
        obj.refreshData();
    } else {
        alert("Invalid viewer object '" + id + "'");
    }
}