{
  description = "Nix flake for Ollama";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = inputs: { self, nixpkgs }: 
    let 
      system = "x86_64-linux";
      pkgs = nixpkgs.legacyPackages.${system};
    in {
      devShells.${system}.default = pkgs.mkShell {
        packages = [
          (pkgs.runCommand "ollama" {} ''
            mkdir -p $out/bin
            curl -L https://ollama.com/download/ollama-linux-amd64 -o $out/bin/ollama
            chmod +x $out/bin/ollama
          '')
        ];
      };
    };
}