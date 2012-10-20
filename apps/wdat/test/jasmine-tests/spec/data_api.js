describe('Specifier Parsing Tests', function () {
  var bus = WDAT.api.EventBus()
    , dapi_proto = WDAT.api.data.DataAPI.prototype;
    
  it('Should create a metadata type url for metadata type requests', function () {
    var url1 = dapi_proto.parseSpecifier({'type': 'section'})
      , url2 = dapi_proto.parseSpecifier({'type': 'property'})
      , url3 = dapi_proto.parseSpecifier({'type': 'value'});

    expect(url1).toMatch(/metadata/);
    expect(url2).toMatch(/metadata/);
    expect(url3).toMatch(/metadata/);
  });
});
