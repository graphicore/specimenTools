/* jshint esversion:6 */
define([], function() {
    "use strict";

    function _filterNode(filterNodes, node) {
        var i, l, filterNode;
        for(i=0,l=filterNodes.length;i<l;i++) {
            filterNode = filterNodes[i];
            if(filterNode === node || filterNode.contains(node))
                return false;
        }
        return true;
    }

    function _getContainers(host, className, nodesFilter) {
        var containersForClass = [];
        // Node.ELEMEMT_NODE === 1 => has a classList
        // Can also be a DOM Document, which doesn't have a classList
        // if it is an ELEMEMT_NODE, it can be a widget by itself.
        if(host.nodeType === 1 && host.classList.contains(className))
            containersForClass.push(host);
        if(host.querySelectorAll)
            Array.prototype.push.apply(containersForClass,
                                host.querySelectorAll(`.${className}`));
        if(nodesFilter)
            return containersForClass.filter(nodesFilter);
        return containersForClass;
    }

    function _getDependencies(argNames, ...dependencies) {
        var args = [];

        entries:
        for(let path of argNames) {
            let parts = path.split('.');
            dependencies:
            for(let depsDict of dependencies) {
                // initially uses parts, but changes _parts
                let _parts = parts;
                while(true) {
                    let name;
                    [name, ..._parts] = _parts;
                    if(!(name in depsDict))
                        // path doesn't lead anywhere
                        continue dependencies;
                    if(!_parts.length) {
                        args.push(depsDict[name]);
                        continue entries; // FOUND IT
                    }
                    // go deeper
                    depsDict = depsDict[name];
                }
            }
            throw new Error(`Can't resolve dependency "${path}"`);
        }
        return args;
    }

    /**
     * doc: a DOM Document or a DOM Element
     * factories: an array of arrays:
     *          [
     *              [
     *                  '.css-class-for-widget-container',
     *                  WidgetConstructor,
     *                  optional further WidgetConstructor_arguments
     *                  , ...
     *              ]
     *          ]
     *      A WidgetConstructor will be called essentially like this:
     *
     *      new WidgetConstructor(domContainer,
     *                            pubsub,
     *                            ..., further WidgetConstructor_arguments);
     */
    function initWidgets(hosts, dependencies, filterNodes=null
                                    , dependenciesForContainerFn=null) {
        //i, l, className, containersForClass, Constructor
        // , j, ll, container
        var containers = []
          , instances = []
          , nodesFilter = filterNodes
                        ? _filterNode.bind(null, filterNodes)
                        : null
          ;
        if(!Array.isArray(hosts))
            hosts = [hosts];
        for(let host of hosts) {
            for(let factory of dependencies.widgetFactories) {
                let [className, Constructor, ...argNames] = factory
                  , containersForClass = _getContainers(host, className, nodesFilter);
                for(let container of containersForClass) {
                    containers.push(container);
                    let containerDependencies = dependenciesForContainerFn
                                ? dependenciesForContainerFn(container)
                                : Object.create(null)
                                ;
                    let args = _getDependencies(argNames, {container}
                                    , containerDependencies, dependencies);
                    instances.push(new Constructor(...args));
                }
            }
        }
        return [instances, containers];
    }

    return initWidgets;
});
