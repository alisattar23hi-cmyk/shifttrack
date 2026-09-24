import OQL "mo:caffeineai-oql";

module {
  /// Collapse an optional timestamp to a queryable int (0 when absent).
  public func _toRow(self : ?Int) : OQL.Value {
    switch self {
      case null { #int(0) };
      case (?v) { #int(v) };
    };
  };
};
