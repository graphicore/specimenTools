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
        Array.prototype.push.apply(containersForClass,
                                host.getElementsByClassName(className));
        if(nodesFilter)
            return containersForClass.filter(nodesFilter);
        return containersForClass
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
    function initWidgets(host, factories, pubsub, filterNodes) {
        var i, l, className, containersForClass, Constructor
         , j, ll, container
         , containers = []
         , args, instance
         , nodesFilter = filterNodes
                        ? _filterNode.bind(null, filterNodes)
                        : null
         ;

        for(i=0,l=factories.length;i<l;i++) {
            className = factories[i][0];
            containersForClass = _getContainers(host, className, nodesFilter);
            Constructor = factories[i][1];
            for(j=0,ll=containersForClass.length;j<ll;j++) {
                container = containersForClass[j];
                containers.push(container);
                args = [container, pubsub];
                Array.prototype.push.apply(args, factories[i].slice(2));
                // this way we can call the Constructor with a
                // dynamic arguments list, i.e. by circumventing the `new`
                // keyword via Object.create.
                instance = Object.create(Constructor.prototype);
                Constructor.apply(instance, args);
            }
        }
        return containers;
    }

    return initWidgets;
});
