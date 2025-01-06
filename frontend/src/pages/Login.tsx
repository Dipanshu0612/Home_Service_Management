import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import LoginImg from "../assets/Login.png";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import "./App.css";


const Login = () => {
  return (
    <div className="flex items-center justify-around h-screen bg-orange-200 space-x-4">
      <img src={LoginImg} alt="Login" className="w-[48%]" />
      <div className="w-[48%] p-4 flex flex-col justify-center">
        <h1>D's Home Service</h1>
        <Card className="bg-[#ffedd8] p-4">
          <CardHeader>
            <CardTitle>Card Title</CardTitle>
            <CardDescription>Card Description</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="LoginForm">
              <div className="grid w-full items-center gap-4">
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" placeholder="Name of your project" />
                </div>
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="framework">Framework</Label>
                  <Select>
                    <SelectTrigger id="framework">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      <SelectItem value="next">Next.js</SelectItem>
                      <SelectItem value="sveltekit">SvelteKit</SelectItem>
                      <SelectItem value="astro">Astro</SelectItem>
                      <SelectItem value="nuxt">Nuxt.js</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button>Deploy</Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default Login;
