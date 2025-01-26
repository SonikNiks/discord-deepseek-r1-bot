{
  description = "Nix flake for Ollama (non-NixOS)";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        ollama-cuda = pkgs.ollama.override { 
          acceleration = "cuda"; 
          cudaGcc = pkgs.gcc11;
        };
      in {
        packages = {
          default = pkgs.ollama;
          cuda = ollama-cuda;
        };

        devShells.default = pkgs.mkShell {
          packages = [ pkgs.ollama ];
          shellHook = ''export HOME="$HOME" '';
        };
      }
    );
}