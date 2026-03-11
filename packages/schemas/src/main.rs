use schemars::schema_for;

mod schemas;

use schemas::MCPSchema;

#[tokio::main]
async fn main() {
    let schema = schema_for!(MCPSchema);
    println!("{:#?}", schema);
}
