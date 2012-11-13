describe('URL Generation using object specifiers', function () {
  var bus = WDAT.api.EventBus()
    , dap = WDAT.api.data.DataAPI.prototype; // DataAPI prototype

  it("Should return sensible URLs for *object* requests", function () {
    var url = dap.parseSpecifier({'object': 'analogsignal_11', 
      'some': 'other', 'parameters': 'that', 'will': 'just', 'be': 'passed'});

    expect(url).toMatch(/\/analogsignal\/11\?some=other&parameters=that&will=just/);
  });
});
