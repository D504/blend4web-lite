var _factories = {};
var _b4w_modules = {};

export default function(module_name, module_context, export_functions) {
  if (_factories[module_name] !== undefined) {
    return _factories[module_name];
  } else {
    var _ns = {};
    var factory = _factories[module_name] = function(ns, exports) {
      if (_ns[ns] !== undefined) {
        return _ns[ns];
      }

      _ns[ns] = {};
      module_context(ns, _ns[ns]);

      return _ns[ns];
    }

    b4w._n_module[module_name] = factory;

    return factory;
  }
}


