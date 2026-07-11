/*************************************************************
 *  Learnosity Question Editor API version v3.108.1
 *
 *  Documentation available at: https://reference.learnosity.com
 *
 *  Copyright 2011 - 2023 Learnosity - https://www.learnosity.com
 */
!(function (e, t) {
    (e.LearnosityQuestionEditor = (function () {
        var e = {};
        function t(e) {
            return "1" === (e = e.slice(0)) || "true" === e;
        }
        return (
            (e.version = "v3.108.1"),
            (e.versions = { requested: "v3", mapped: "v3", concrete: "v3.108.1", server: "v3", assets: "v3.108.1" }),
            (e.errors = []),
            (e._internal = {}),
            (e._internal.cachedExposedMethodsCalls = []),
            (e._internal.EXPOSED_METHODS = ["setWidget", "getWidget", "getMetadata", "safeToUnload", "on", "once", "off"]),
            (e._internal.getDirectionProperty = function () {
                var e = document.querySelector("script[data-lrn-dir]"),
                    t = e ? e.dataset.lrnDir : null;
                return t && -1 !== ["ltr", "rtl"].indexOf(t) ? t : null;
            }),
            (e._internal.config = {
                apiHost: "https://questioneditor.learnosity.com/" + e.versions.server,
                apiAssetsHost: "https://questioneditor.learnosity.com/" + e.versions.assets,
                assetUrl: "https://assets.learnosity.com/questiontypes/",
                devEnvironment: t("false"),
                docsPath: "https://docs.learnosity.com",
                questionsApiVersion: 0 !== "{:version_questionsapi:}".indexOf("{:") ? "{:version_questionsapi:}" : null,
                questionsApiPath: "https://questions.learnosity.com/",
                questionsApiSupportedVersions: "{:questionsApiSupportedVersions:}",
                questionsApiUAid: "UA-249610-21",
                requestedApiVersion: e.versions.requested,
                schemasPath: "https://schemas.learnosity.com/latest/questions/",
                schemasQuestionsApiVersion: "develop",
                analytics: { account: "UA-249610-27", tracker: "lrnQuestionEditor" },
                sharedLibUrl: "https://shared.learnosity.com",
                appContext: "Question Editor API",
                gtmContainerID: "GTM-5ZVXFJ",
                gtmDataLayer: "lrnDataLayer",
                disableGTM: t("1"),
                textDirection: e._internal.getDirectionProperty(),
            }),
            (e.addScriptToDom = function (t) {
                var n = document.createElement("script");
                e._internal.config.devEnvironment && -1 === t.indexOf("?") && (t += "?bust=" + new Date().getTime()), (n.src = t), document.querySelector("head").appendChild(n);
            }),
            (e.loadCss = function (t) {
                e._internal.config.apiAssetsHost && (t = e._internal.config.apiAssetsHost + t);
                var n = document.createElement("link");
                (n.type = "text/css"),
                    (n.rel = "stylesheet"),
                    (n.href = t),
                    e._internal.config.devEnvironment && (n.href += (-1 === t.indexOf("?") ? "?" : "&") + "bust=" + new Date().getTime()),
                    document.querySelector("head").appendChild(n);
            }),
            (e.init = function () {
                var t = Array.prototype.slice.call(arguments),
                    n = {};
                return (
                    this._internal._cachedInitCalls || (this._internal._cachedInitCalls = []),
                    t.push({ appStub: n }),
                    this._internal._cachedInitCalls.push({ args: t }),
                    (function (t) {
                        for (var n = 0; n < e._internal.EXPOSED_METHODS.length; n++) s(e._internal.EXPOSED_METHODS[n]);
                        function s(n) {
                            t[n] = function () {
                                e._internal.cachedExposedMethodsCalls.push({ method: n, args: Array.prototype.slice.call(arguments) });
                            };
                        }
                    })(n),
                    n
                );
            }),
            e
        );
    })()),
        (e.LRNCKEDITOR_BASEPATH = e.LearnosityQuestionEditor._internal.config.apiAssetsHost + "/vendor/ckeditor/"),
        e.LearnosityQuestionEditor.addScriptToDom(e.LearnosityQuestionEditor._internal.config.apiAssetsHost + "/dist/api.js"),
        e.LearnosityQuestionEditor.loadCss("/stylesheets/css/preload.css");
       
})(this);
