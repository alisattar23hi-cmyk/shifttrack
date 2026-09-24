import OQL "mo:caffeineai-oql";

module {
  /// Collapse a role variant to a queryable text tag.
  public func _toRow(self : { #worker; #owner }) : OQL.Value {
    #text(
      switch self {
        case (#worker) { "worker" };
        case (#owner) { "owner" };
      }
    );
  };
};
