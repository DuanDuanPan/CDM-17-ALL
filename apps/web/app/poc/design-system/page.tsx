'use client';

import * as React from 'react';
import {
    Button,
    Input,
    Badge,
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    CardFooter,
} from '@cdm/ui';
import { Loader2, Plus, ChevronRight, Mail, Search } from 'lucide-react';

export default function DesignSystemPage() {
    const [isDark, setIsDark] = React.useState(false);

    React.useEffect(() => {
        if (isDark) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        // Cleanup: 离开页面时移除 dark class，避免污染其他路由
        return () => {
            document.documentElement.classList.remove('dark');
        };
    }, [isDark]);

    return (
        <div className="min-h-screen bg-background p-8">
            <div className="mx-auto max-w-4xl space-y-12">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">
                            Design System - Atomic Components
                        </h1>
                        <p className="text-muted-foreground mt-2">
                            Story 7.3 验证页面 - UI Atomic Components POC
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        onClick={() => setIsDark(!isDark)}
                    >
                        {isDark ? '☀️ Light' : '🌙 Dark'}
                    </Button>
                </div>

                {/* Button Section */}
                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold text-foreground border-b pb-2">
                        Button 按钮
                    </h2>

                    {/* Variants */}
                    <div className="space-y-2">
                        <h3 className="text-sm font-medium text-muted-foreground">
                            Variants 变体
                        </h3>
                        <div className="flex flex-wrap gap-3">
                            <Button variant="default">Default</Button>
                            <Button variant="destructive">Destructive</Button>
                            <Button variant="outline">Outline</Button>
                            <Button variant="secondary">Secondary</Button>
                            <Button variant="ghost">Ghost</Button>
                            <Button variant="link">Link</Button>
                        </div>
                    </div>

                    {/* Sizes */}
                    <div className="space-y-2">
                        <h3 className="text-sm font-medium text-muted-foreground">
                            Sizes 尺寸
                        </h3>
                        <div className="flex flex-wrap items-center gap-3">
                            <Button size="sm">Small</Button>
                            <Button size="default">Default</Button>
                            <Button size="lg">Large</Button>
                            <Button size="icon">
                                <Plus />
                            </Button>
                        </div>
                    </div>

                    {/* With Icons */}
                    <div className="space-y-2">
                        <h3 className="text-sm font-medium text-muted-foreground">
                            With Icons 图标按钮
                        </h3>
                        <div className="flex flex-wrap gap-3">
                            <Button>
                                <Mail /> Login with Email
                            </Button>
                            <Button variant="outline">
                                Next <ChevronRight />
                            </Button>
                            <Button variant="secondary" disabled>
                                <Loader2 className="animate-spin" /> Loading...
                            </Button>
                            <Button variant="outline" size="icon">
                                <Search />
                            </Button>
                        </div>
                    </div>

                    {/* States */}
                    <div className="space-y-2">
                        <h3 className="text-sm font-medium text-muted-foreground">
                            States 状态
                        </h3>
                        <div className="flex flex-wrap gap-3">
                            <Button>Normal</Button>
                            <Button disabled>Disabled</Button>
                        </div>
                    </div>
                </section>

                {/* Input Section */}
                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold text-foreground border-b pb-2">
                        Input 输入框
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label
                                htmlFor="email"
                                className="text-sm font-medium text-foreground"
                            >
                                Email
                            </label>
                            <Input id="email" type="email" placeholder="you@example.com" />
                        </div>

                        <div className="space-y-2">
                            <label
                                htmlFor="password"
                                className="text-sm font-medium text-foreground"
                            >
                                Password
                            </label>
                            <Input id="password" type="password" placeholder="••••••••" />
                        </div>

                        <div className="space-y-2">
                            <label
                                htmlFor="disabled"
                                className="text-sm font-medium text-foreground"
                            >
                                Disabled
                            </label>
                            <Input
                                id="disabled"
                                type="text"
                                placeholder="Cannot edit"
                                disabled
                            />
                        </div>

                        <div className="space-y-2">
                            <label
                                htmlFor="file"
                                className="text-sm font-medium text-foreground"
                            >
                                File Input
                            </label>
                            <Input id="file" type="file" />
                        </div>
                    </div>
                </section>

                {/* Badge Section */}
                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold text-foreground border-b pb-2">
                        Badge 徽章
                    </h2>

                    {/* Base Variants */}
                    <div className="space-y-2">
                        <h3 className="text-sm font-medium text-muted-foreground">
                            Base Variants 基础变体
                        </h3>
                        <div className="flex flex-wrap gap-3">
                            <Badge variant="default">Default</Badge>
                            <Badge variant="secondary">Secondary</Badge>
                            <Badge variant="destructive">Destructive</Badge>
                            <Badge variant="outline">Outline</Badge>
                        </div>
                    </div>

                    {/* Semantic Variants (New) */}
                    <div className="space-y-2">
                        <h3 className="text-sm font-medium text-muted-foreground">
                            Semantic Variants 语义变体 (Story 7.3 扩展)
                        </h3>
                        <div className="flex flex-wrap gap-3">
                            <Badge variant="success">Success 成功</Badge>
                            <Badge variant="warning">Warning 警告</Badge>
                            <Badge variant="info">Info 信息</Badge>
                        </div>
                    </div>

                    {/* Use Cases */}
                    <div className="space-y-2">
                        <h3 className="text-sm font-medium text-muted-foreground">
                            Use Cases 使用场景
                        </h3>
                        <div className="flex flex-wrap gap-3">
                            <Badge>New</Badge>
                            <Badge variant="secondary">Beta</Badge>
                            <Badge variant="destructive">Deprecated</Badge>
                            <Badge variant="outline">v1.0.0</Badge>
                            <Badge variant="success">Approved</Badge>
                            <Badge variant="warning">Pending</Badge>
                            <Badge variant="info">In Progress</Badge>
                        </div>
                    </div>
                </section>

                {/* Card Section */}
                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold text-foreground border-b pb-2">
                        Card 卡片
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Standard Card */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Create Project</CardTitle>
                                <CardDescription>
                                    Deploy your new project in one-click.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-foreground">
                                            Name
                                        </label>
                                        <Input placeholder="My Project" />
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="flex justify-between">
                                <Button variant="outline">Cancel</Button>
                                <Button>Deploy</Button>
                            </CardFooter>
                        </Card>

                        {/* Information Card */}
                        <Card>
                            <CardHeader>
                                <div className="flex items-center gap-2">
                                    <CardTitle>Notifications</CardTitle>
                                    <Badge variant="secondary">3 new</Badge>
                                </div>
                                <CardDescription>
                                    You have 3 unread messages.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex items-center gap-3 p-3 rounded-md bg-secondary/50">
                                    <div className="h-2 w-2 rounded-full bg-primary" />
                                    <div className="text-sm">
                                        <p className="font-medium">New comment on your post</p>
                                        <p className="text-muted-foreground">5 min ago</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-3 rounded-md bg-secondary/50">
                                    <div className="h-2 w-2 rounded-full bg-destructive" />
                                    <div className="text-sm">
                                        <p className="font-medium">Build failed</p>
                                        <p className="text-muted-foreground">10 min ago</p>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button variant="ghost" className="w-full">
                                    View all notifications
                                </Button>
                            </CardFooter>
                        </Card>
                    </div>
                </section>

                {/* Footer */}
                <footer className="text-center text-sm text-muted-foreground pt-8 border-t">
                    <p>
                        Story 7.3: UI Atomic Components | CDM-17 Design System
                    </p>
                </footer>
            </div>
        </div>
    );
}
